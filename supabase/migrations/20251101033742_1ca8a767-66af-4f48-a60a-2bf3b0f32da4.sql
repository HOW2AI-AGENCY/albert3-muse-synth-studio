-- Phase 1, Week 1: SQL Query Optimization
-- Create performance indexes for tracks queries

-- Index for filtering by user_id and status (most common query)
CREATE INDEX IF NOT EXISTS idx_tracks_user_status 
  ON public.tracks(user_id, status) 
  WHERE status IN ('processing', 'pending', 'completed');

-- Index for track versions lookup
CREATE INDEX IF NOT EXISTS idx_track_versions_parent_id 
  ON public.track_versions(parent_track_id);

-- Index for track stems lookup
CREATE INDEX IF NOT EXISTS idx_track_stems_track_id 
  ON public.track_stems(track_id);

-- Index for track likes for JOIN queries
CREATE INDEX IF NOT EXISTS idx_track_likes_track_id 
  ON public.track_likes(track_id);

-- Index for created_at DESC ordering (for recent tracks)
CREATE INDEX IF NOT EXISTS idx_tracks_created_at 
  ON public.tracks(created_at DESC);

-- Composite index for user + created_at (optimized feed queries)
CREATE INDEX IF NOT EXISTS idx_tracks_user_created 
  ON public.tracks(user_id, created_at DESC);

-- Index for public tracks discovery
CREATE INDEX IF NOT EXISTS idx_tracks_public_status 
  ON public.tracks(is_public, status) 
  WHERE is_public = true AND status = 'completed';