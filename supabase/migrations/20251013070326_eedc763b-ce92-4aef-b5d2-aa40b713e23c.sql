-- TASK-2.4: Fix Function Search Path Security Issue
-- Drop and recreate functions with correct signatures

-- Drop existing get_user_mureka_stats function
DROP FUNCTION IF EXISTS public.get_user_mureka_stats(uuid);

-- Recreate get_user_mureka_stats with correct return type and search_path
CREATE OR REPLACE FUNCTION public.get_user_mureka_stats(user_uuid uuid)
RETURNS TABLE(
  total_tracks bigint,
  total_plays bigint,
  total_likes bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT t.id) as total_tracks,
    COALESCE(SUM(t.play_count), 0) as total_plays,
    COALESCE(SUM(t.like_count), 0) as total_likes
  FROM public.tracks t
  WHERE t.user_id = user_uuid
    AND t.provider = 'mureka';
$$;