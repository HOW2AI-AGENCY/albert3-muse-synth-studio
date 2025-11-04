-- Migration: Add track version likes system
-- Date: 2025-11-04
-- Description: Enable per-version likes instead of track-level likes

-- =====================================================
-- 1. Create track_version_likes table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.track_version_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.track_versions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure a user can only like a version once
  UNIQUE(user_id, version_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_version_likes_user_id 
  ON public.track_version_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_version_likes_version_id 
  ON public.track_version_likes(version_id);

CREATE INDEX IF NOT EXISTS idx_version_likes_created_at 
  ON public.track_version_likes(created_at DESC);

COMMENT ON TABLE public.track_version_likes IS 'Stores user likes for specific track versions';

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
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement like count
    UPDATE track_versions 
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = OLD.version_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_version_likes_count_trigger ON public.track_version_likes;
CREATE TRIGGER update_version_likes_count_trigger
  AFTER INSERT OR DELETE ON public.track_version_likes
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_version_likes_count();

-- =====================================================
-- 4. RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE public.track_version_likes ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- 6. Initialize like_count for existing versions
-- =====================================================
-- Set like_count to 0 for all existing versions
UPDATE public.track_versions 
SET like_count = 0 
WHERE like_count IS NULL;

-- =====================================================
-- 7. Grant permissions
-- =====================================================
GRANT SELECT, INSERT, DELETE ON public.track_version_likes TO authenticated;
GRANT USAGE ON SEQUENCE track_version_likes_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_version_liked TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_version_likes_count TO authenticated;
