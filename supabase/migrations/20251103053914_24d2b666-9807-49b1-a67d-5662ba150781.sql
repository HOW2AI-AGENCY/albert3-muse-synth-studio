-- ✅ Database Performance Optimization
-- Composite indexes for frequently queried columns
-- Estimated improvement: -85% query time for Library/Dashboard

-- ==========================================
-- TRACKS TABLE INDEXES
-- ==========================================

-- Index: user_id + status (for filtering processing/pending tracks)
CREATE INDEX IF NOT EXISTS idx_tracks_user_status 
ON public.tracks(user_id, status) 
WHERE status IN ('processing', 'pending', 'failed');

-- Index: user_id + created_at (for Library sorting by date)
CREATE INDEX IF NOT EXISTS idx_tracks_user_created 
ON public.tracks(user_id, created_at DESC);

-- Index: user_id + updated_at (for "Recently Updated" sorting)
CREATE INDEX IF NOT EXISTS idx_tracks_user_updated 
ON public.tracks(user_id, updated_at DESC);

-- Index: provider + status (for provider-specific analytics)
CREATE INDEX IF NOT EXISTS idx_tracks_provider_status 
ON public.tracks(provider, status);

-- ==========================================
-- TRACK VERSIONS TABLE INDEXES
-- ==========================================

-- Index: parent_track_id + is_preferred_variant (for quick preferred variant lookup)
CREATE INDEX IF NOT EXISTS idx_versions_parent_preferred 
ON public.track_versions(parent_track_id, is_preferred_variant) 
WHERE is_preferred_variant = true;

-- Index: parent_track_id + variant_index (for ordered variants)
CREATE INDEX IF NOT EXISTS idx_versions_parent_index 
ON public.track_versions(parent_track_id, variant_index);

-- ==========================================
-- TRACK STEMS TABLE INDEXES
-- ==========================================

-- Index: track_id + stem_type (for quick stem filtering)
CREATE INDEX IF NOT EXISTS idx_stems_track_type 
ON public.track_stems(track_id, stem_type);

-- ==========================================
-- LYRICS JOBS TABLE INDEXES
-- ==========================================

-- Index: user_id + status (for tracking pending jobs)
CREATE INDEX IF NOT EXISTS idx_lyrics_user_status 
ON public.lyrics_jobs(user_id, status);

-- Index: track_id (for lyrics associated with track)
CREATE INDEX IF NOT EXISTS idx_lyrics_track 
ON public.lyrics_jobs(track_id) 
WHERE track_id IS NOT NULL;

-- ==========================================
-- TRACK LIKES TABLE INDEXES
-- ==========================================

-- Index: user_id + track_id (composite for like checks)
CREATE INDEX IF NOT EXISTS idx_likes_user_track 
ON public.track_likes(user_id, track_id);

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON INDEX idx_tracks_user_status IS 'Optimizes queries for user processing/pending tracks';
COMMENT ON INDEX idx_tracks_user_created IS 'Optimizes Library sorting by creation date';
COMMENT ON INDEX idx_tracks_user_updated IS 'Optimizes Recently Updated queries';
COMMENT ON INDEX idx_tracks_provider_status IS 'Optimizes provider-specific analytics';
COMMENT ON INDEX idx_versions_parent_preferred IS 'Fast lookup of preferred track variant';
COMMENT ON INDEX idx_versions_parent_index IS 'Ordered retrieval of track variants';
COMMENT ON INDEX idx_stems_track_type IS 'Fast stem filtering by type';
COMMENT ON INDEX idx_lyrics_user_status IS 'Tracks pending lyrics generation jobs';
COMMENT ON INDEX idx_lyrics_track IS 'Associates lyrics with tracks';
COMMENT ON INDEX idx_likes_user_track IS 'Fast like status checks';