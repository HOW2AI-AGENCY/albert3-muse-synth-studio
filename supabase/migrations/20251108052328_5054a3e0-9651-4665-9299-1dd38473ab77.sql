-- ✅ FIX 1: Создание таблицы track_version_likes для системы лайков версий

CREATE TABLE IF NOT EXISTS public.track_version_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.track_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(version_id, user_id)
);

-- Enable RLS
ALTER TABLE public.track_version_likes ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own likes
CREATE POLICY "Users can view all version likes"
  ON public.track_version_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create own version likes"
  ON public.track_version_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own version likes"
  ON public.track_version_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ✅ FIX 2: Добавление like_count в track_versions если отсутствует
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'track_versions' 
    AND column_name = 'like_count'
  ) THEN
    ALTER TABLE public.track_versions ADD COLUMN like_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- ✅ FIX 3: Функция для автоматического обновления like_count при изменении лайков
CREATE OR REPLACE FUNCTION public.update_track_version_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE track_versions
    SET like_count = like_count + 1
    WHERE id = NEW.version_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE track_versions
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.version_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ✅ FIX 4: Триггер для автоматического обновления like_count
DROP TRIGGER IF EXISTS track_version_likes_count_trigger ON public.track_version_likes;
CREATE TRIGGER track_version_likes_count_trigger
  AFTER INSERT OR DELETE ON public.track_version_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_track_version_like_count();

-- ✅ FIX 5: Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_track_version_likes_version_id ON public.track_version_likes(version_id);
CREATE INDEX IF NOT EXISTS idx_track_version_likes_user_id ON public.track_version_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_track_version_likes_created_at ON public.track_version_likes(created_at DESC);