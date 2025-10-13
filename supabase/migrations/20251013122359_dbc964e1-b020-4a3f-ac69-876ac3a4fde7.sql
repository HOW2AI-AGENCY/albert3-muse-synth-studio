-- Migration: Performance Optimization Indexes
-- Description: Add indexes to optimize frequently used queries in tracks and track_versions tables
-- Author: Performance Optimization Phase 3.1
-- Date: 2025-10-13

-- Optimize tracks queries by user_id and status (most common filter combination)
CREATE INDEX IF NOT EXISTS idx_tracks_user_status 
ON public.tracks(user_id, status) 
WHERE status IN ('pending', 'processing', 'completed');

-- Optimize tracks ordering by creation date (descending for recent tracks)
CREATE INDEX IF NOT EXISTS idx_tracks_created_at_desc 
ON public.tracks(created_at DESC);

-- Optimize tracks queries by provider and status (for provider-specific filtering)
CREATE INDEX IF NOT EXISTS idx_tracks_provider_status 
ON public.tracks(provider, status);

-- Optimize track_versions queries by parent_track_id and version_number
CREATE INDEX IF NOT EXISTS idx_track_versions_parent_version 
ON public.track_versions(parent_track_id, version_number DESC);

-- Optimize track_versions queries for master versions
CREATE INDEX IF NOT EXISTS idx_track_versions_master 
ON public.track_versions(parent_track_id, is_master) 
WHERE is_master = true;

-- Optimize track_likes queries by track_id (for counting likes)
CREATE INDEX IF NOT EXISTS idx_track_likes_track 
ON public.track_likes(track_id);

-- Optimize track_likes queries by user_id (for user's liked tracks)
CREATE INDEX IF NOT EXISTS idx_track_likes_user 
ON public.track_likes(user_id);

-- Optimize track_stems queries by track_id and stem_type
CREATE INDEX IF NOT EXISTS idx_track_stems_track_type 
ON public.track_stems(track_id, stem_type);

-- Optimize notifications queries by user_id and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON public.notifications(user_id, read, created_at DESC);

-- Add composite index for tracks with audio_url check (completed tracks with audio)
CREATE INDEX IF NOT EXISTS idx_tracks_completed_audio 
ON public.tracks(user_id, status) 
WHERE status = 'completed' AND audio_url IS NOT NULL;

-- Analyze tables to update statistics for query planner
ANALYZE public.tracks;
ANALYZE public.track_versions;
ANALYZE public.track_likes;
ANALYZE public.track_stems;
ANALYZE public.notifications;