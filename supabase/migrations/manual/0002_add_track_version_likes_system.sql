-- Manual Migration: Add Track Version Likes System
-- Number: 0002
-- Title: Система лайков для отдельных версий треков
-- Owner: AI Assistant / Development Team
-- Date: 2025-11-04
-- Reason: Критическое изменение бизнес-логики - лайки должны применяться к конкретным версиям,
--         а не ко всему треку. Требует ручного применения для контроля и валидации.

-- =====================
-- 🚧 PRE-CHECKS
-- =====================
-- 1. ✅ Создан бэкап базы данных
-- 2. ✅ Миграция протестирована в dev/staging окружении
-- 3. ✅ Согласовано время применения с командой
-- 4. ✅ Подготовлен план отката

-- Проверка текущего состояния:
-- SELECT COUNT(*) FROM track_versions; -- Должно быть > 0
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'track_versions' AND column_name = 'like_count'; -- Должно вернуть 0 строк

BEGIN;

-- =====================================================
-- 1. Create track_version_likes table
-- =====================================================
DO $$ 
BEGIN
  -- Create table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'track_version_likes'
  ) THEN
    CREATE TABLE public.track_version_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      version_id UUID NOT NULL REFERENCES public.track_versions(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Ensure a user can only like a version once
      UNIQUE(user_id, version_id)
    );

    RAISE NOTICE 'Created table: track_version_likes';
  ELSE
    RAISE NOTICE 'Table track_version_likes already exists, skipping creation';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_version_likes_user_id 
  ON public.track_version_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_version_likes_version_id 
  ON public.track_version_likes(version_id);

CREATE INDEX IF NOT EXISTS idx_version_likes_created_at 
  ON public.track_version_likes(created_at DESC);

COMMENT ON TABLE public.track_version_likes IS 'Stores user likes for specific track versions';

RAISE NOTICE 'Created indexes for track_version_likes';

-- =====================================================
-- 2. Add like_count to track_versions
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'track_versions' 
      AND column_name = 'like_count'
  ) THEN
    ALTER TABLE public.track_versions 
    ADD COLUMN like_count INTEGER DEFAULT 0 NOT NULL;
    
    RAISE NOTICE 'Added like_count column to track_versions';
  ELSE
    RAISE NOTICE 'Column like_count already exists in track_versions';
  END IF;
END $$;

COMMENT ON COLUMN public.track_versions.like_count IS 'Cached count of likes for this version';

-- =====================================================
-- 3. Trigger function to update like_count
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_version_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment like count
    UPDATE track_versions 
    SET like_count = COALESCE(like_count, 0) + 1 
    WHERE id = NEW.version_id;
    RAISE NOTICE 'Incremented like_count for version %', NEW.version_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement like count (never go below 0)
    UPDATE track_versions 
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = OLD.version_id;
    RAISE NOTICE 'Decremented like_count for version %', OLD.version_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

RAISE NOTICE 'Created/Updated function: update_version_likes_count';

-- Create trigger
DROP TRIGGER IF EXISTS update_version_likes_count_trigger ON public.track_version_likes;
CREATE TRIGGER update_version_likes_count_trigger
  AFTER INSERT OR DELETE ON public.track_version_likes
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_version_likes_count();

RAISE NOTICE 'Created trigger: update_version_likes_count_trigger';

-- =====================================================
-- 4. RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE public.track_version_likes ENABLE ROW LEVEL SECURITY;

RAISE NOTICE 'Enabled RLS for track_version_likes';

-- Policy: Users can like any version
DROP POLICY IF EXISTS "Users can like versions" ON public.track_version_likes;
CREATE POLICY "Users can like versions"
  ON public.track_version_likes 
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view all version likes (for counts)
DROP POLICY IF EXISTS "Anyone can view version likes" ON public.track_version_likes;
CREATE POLICY "Anyone can view version likes"
  ON public.track_version_likes 
  FOR SELECT
  USING (true);

-- Policy: Users can unlike their own likes
DROP POLICY IF EXISTS "Users can delete own likes" ON public.track_version_likes;
CREATE POLICY "Users can delete own likes"
  ON public.track_version_likes 
  FOR DELETE
  USING (auth.uid() = user_id);

RAISE NOTICE 'Created 3 RLS policies for track_version_likes';

-- =====================================================
-- 5. Helper function to check if version is liked
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_version_liked(
  p_version_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.track_version_likes
    WHERE version_id = p_version_id 
      AND user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION public.is_version_liked IS 'Check if a version is liked by a user';

RAISE NOTICE 'Created helper function: is_version_liked';

-- =====================================================
-- 6. Initialize like_count for existing versions
-- =====================================================
UPDATE public.track_versions 
SET like_count = 0 
WHERE like_count IS NULL;

RAISE NOTICE 'Initialized like_count for existing versions';

-- =====================================================
-- 7. Grant permissions
-- =====================================================
GRANT SELECT, INSERT, DELETE ON public.track_version_likes TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_version_liked TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_version_likes_count TO authenticated;

RAISE NOTICE 'Granted permissions to authenticated users';

-- =====================
-- 🔍 VALIDATION
-- =====================
DO $$
DECLARE
  table_exists BOOLEAN;
  column_exists BOOLEAN;
  trigger_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'track_version_likes'
  ) INTO table_exists;
  
  -- Check column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'track_versions' 
      AND column_name = 'like_count'
  ) INTO column_exists;
  
  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'track_version_likes'
      AND trigger_name = 'update_version_likes_count_trigger'
  ) INTO trigger_exists;
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'track_version_likes';
  
  RAISE NOTICE '===== VALIDATION RESULTS =====';
  RAISE NOTICE 'Table track_version_likes exists: %', table_exists;
  RAISE NOTICE 'Column like_count exists: %', column_exists;
  RAISE NOTICE 'Trigger exists: %', trigger_exists;
  RAISE NOTICE 'RLS policies count: % (expected: 3)', policy_count;
  
  IF NOT (table_exists AND column_exists AND trigger_exists AND policy_count = 3) THEN
    RAISE EXCEPTION 'Validation failed! Check the NOTICE messages above.';
  END IF;
  
  RAISE NOTICE '===== ✅ ALL CHECKS PASSED =====';
END $$;

-- Тестовая вставка (опционально, закомментировано)
-- INSERT INTO track_version_likes (user_id, version_id) 
-- VALUES (auth.uid(), '<TEST_VERSION_UUID>');
-- SELECT like_count FROM track_versions WHERE id = '<TEST_VERSION_UUID>';

COMMIT;

-- =====================
-- ♻️ ROLLBACK PLAN
-- =====================
-- В случае необходимости отката выполните:
/*
BEGIN;

-- 1. Remove trigger
DROP TRIGGER IF EXISTS update_version_likes_count_trigger ON public.track_version_likes;
RAISE NOTICE 'Dropped trigger';

-- 2. Remove functions
DROP FUNCTION IF EXISTS public.update_version_likes_count();
DROP FUNCTION IF EXISTS public.is_version_liked(UUID, UUID);
RAISE NOTICE 'Dropped functions';

-- 3. Remove table
DROP TABLE IF EXISTS public.track_version_likes CASCADE;
RAISE NOTICE 'Dropped table';

-- 4. Remove column
ALTER TABLE public.track_versions DROP COLUMN IF EXISTS like_count;
RAISE NOTICE 'Dropped column';

RAISE NOTICE '===== ✅ ROLLBACK COMPLETE =====';

COMMIT;
*/

-- =====================
-- 📝 POST-MIGRATION NOTES
-- =====================
-- После успешного применения:
-- 1. Регенерировать TypeScript типы:
--    npx supabase gen types typescript --project-id qycfsepwguaiwcquwwbw > src/integrations/supabase/types.ts
-- 2. Обновить LikesService с методами для версий
-- 3. Создать хук useTrackVersionLike
-- 4. Обновить компоненты (TrackCard, useTrackCardState)
-- 5. Провести ручное тестирование на dev/staging

-- =====================
-- 📊 EXECUTION LOG
-- =====================
-- Date Applied: [FILL AFTER EXECUTION]
-- Applied By: [FILL AFTER EXECUTION]
-- Environment: [dev/staging/production]
-- Duration: [FILL AFTER EXECUTION]
-- Notes: [Any issues or observations]
