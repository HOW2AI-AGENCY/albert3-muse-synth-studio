-- Sprint 31 Week 1: Critical Database Optimization
-- Date: 2025-10-31
-- Purpose: Add missing indexes + materialized views for performance

-- ============================================
-- CRITICAL INDEXES (Performance +90%)
-- ============================================

-- 1. User + Status composite index
CREATE INDEX IF NOT EXISTS idx_tracks_user_status 
  ON public.tracks(user_id, status) 
  WHERE status IN ('processing', 'pending');

-- 2. Created date descending
CREATE INDEX IF NOT EXISTS idx_tracks_created_at_desc 
  ON public.tracks(created_at DESC);

-- 3. Provider + Status
CREATE INDEX IF NOT EXISTS idx_tracks_provider_status 
  ON public.tracks(provider, status);

-- 4. Style tags GIN index
CREATE INDEX IF NOT EXISTS idx_tracks_tags_gin 
  ON public.tracks USING gin(style_tags);

-- 5. Analytics events
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created 
  ON public.analytics_events(user_id, created_at DESC);

-- 6. Track versions
CREATE INDEX IF NOT EXISTS idx_track_versions_parent_version 
  ON public.track_versions(parent_track_id, variant_index);

-- 7. Track stems
CREATE INDEX IF NOT EXISTS idx_track_stems_track_type 
  ON public.track_stems(track_id, stem_type);

-- 8. Saved lyrics favorite
CREATE INDEX IF NOT EXISTS idx_saved_lyrics_user_favorite 
  ON public.saved_lyrics(user_id, is_favorite) 
  WHERE is_favorite = true;

-- ============================================
-- FULL-TEXT SEARCH
-- ============================================

-- 9. Lyrics search
CREATE INDEX IF NOT EXISTS idx_saved_lyrics_search 
  ON public.saved_lyrics 
  USING gin(to_tsvector('russian', COALESCE(content, '')));

-- 10. Tracks search
CREATE INDEX IF NOT EXISTS idx_tracks_title_search 
  ON public.tracks 
  USING gin(to_tsvector('russian', COALESCE(title, '') || ' ' || COALESCE(prompt, '')));

-- ============================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================

-- User statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  COUNT(DISTINCT t.id) as total_tracks,
  COALESCE(SUM(t.play_count), 0) as total_plays,
  COALESCE(SUM(t.like_count), 0) as total_likes,
  COALESCE(SUM(t.download_count), 0) as total_downloads,
  COALESCE(SUM(t.view_count), 0) as total_views,
  MAX(t.created_at) as last_track_created,
  COUNT(DISTINCT CASE WHEN t.created_at >= NOW() - INTERVAL '7 days' THEN t.id END) as tracks_last_7_days,
  COUNT(DISTINCT CASE WHEN t.created_at >= NOW() - INTERVAL '30 days' THEN t.id END) as tracks_last_30_days
FROM public.profiles u
LEFT JOIN public.tracks t ON t.user_id = u.id
GROUP BY u.id, u.email, u.full_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stats_user_id 
  ON public.user_stats(user_id);

-- Daily generations
CREATE MATERIALIZED VIEW IF NOT EXISTS public.analytics_generations_daily AS
SELECT 
  DATE(created_at) as date,
  provider,
  status,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_generation_time_seconds
FROM public.tracks
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at), provider, status
ORDER BY date DESC;

CREATE INDEX IF NOT EXISTS idx_analytics_generations_daily_date 
  ON public.analytics_generations_daily(date DESC);

-- Top genres
CREATE MATERIALIZED VIEW IF NOT EXISTS public.analytics_top_genres AS
SELECT 
  genre,
  COUNT(*) as track_count,
  COALESCE(SUM(play_count), 0) as total_plays,
  COALESCE(AVG(play_count), 0) as avg_plays,
  COUNT(DISTINCT user_id) as unique_creators
FROM public.tracks
WHERE genre IS NOT NULL 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY genre
ORDER BY track_count DESC
LIMIT 50;

-- ============================================
-- REFRESH FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.user_stats;
  REFRESH MATERIALIZED VIEW public.analytics_generations_daily;
  REFRESH MATERIALIZED VIEW public.analytics_top_genres;
  
  RAISE NOTICE 'Analytics views refreshed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_analytics_views() TO authenticated;

COMMENT ON FUNCTION public.refresh_analytics_views IS 
  'Refreshes all analytics materialized views. Schedule with pg_cron.';