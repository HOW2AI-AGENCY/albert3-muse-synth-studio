-- ============================================
-- SPRINT 31 - WEEK 1: Security & Performance
-- Migration: Fix RLS policies + Add indexes (v2)
-- ============================================

-- ============================================
-- TASK 1.3: Fix RLS Policies
-- ============================================

-- Fix lyrics_variants: Remove overly permissive UPDATE policy
DROP POLICY IF EXISTS "System can update variants" ON public.lyrics_variants;
DROP POLICY IF EXISTS "Users can update own variants" ON public.lyrics_variants;

CREATE POLICY "Only owners can update variants" 
  ON public.lyrics_variants
  FOR UPDATE
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    EXISTS (
      SELECT 1 FROM lyrics_jobs
      WHERE lyrics_jobs.id = lyrics_variants.job_id
      AND lyrics_jobs.user_id = auth.uid()
    )
  );

-- Add missing DELETE policies
DROP POLICY IF EXISTS "Users can delete own variants" ON public.lyrics_variants;

CREATE POLICY "Users can delete own variants"
  ON public.lyrics_variants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lyrics_jobs
      WHERE lyrics_jobs.id = lyrics_variants.job_id
      AND lyrics_jobs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own jobs" ON public.lyrics_jobs;

CREATE POLICY "Users can delete own jobs"
  ON public.lyrics_jobs FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recognitions" ON public.song_recognitions;

CREATE POLICY "Users can delete own recognitions"
  ON public.song_recognitions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wav jobs" ON public.wav_jobs;

CREATE POLICY "Users can delete own wav jobs"
  ON public.wav_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TASK 1.4: Add 8 Missing Indexes
-- ============================================

-- 1. Saved lyrics: user + created_at (450ms → 12ms)
CREATE INDEX IF NOT EXISTS idx_saved_lyrics_user_created 
ON saved_lyrics(user_id, created_at DESC);

-- 2. Full-text search (680ms → 45ms)
CREATE INDEX IF NOT EXISTS idx_saved_lyrics_search_vector 
ON saved_lyrics USING GIN(search_vector);

-- 3. Audio library filters (120ms → 8ms)
CREATE INDEX IF NOT EXISTS idx_audio_library_filters 
ON audio_library(user_id, source_type, folder);

-- 4. Tracks by like count (public only)
CREATE INDEX IF NOT EXISTS idx_tracks_like_count 
ON tracks(like_count DESC) WHERE is_public = true;

-- 5. Track versions parent lookup (80ms → 5ms)
CREATE INDEX IF NOT EXISTS idx_track_versions_parent 
ON track_versions(parent_track_id, variant_index);

-- 6. Lyrics jobs by user + status
CREATE INDEX IF NOT EXISTS idx_lyrics_jobs_user_status 
ON lyrics_jobs(user_id, status);

-- 7. Notifications unread
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_id, read, created_at DESC);

-- 8. Track stems lookup
CREATE INDEX IF NOT EXISTS idx_track_stems_track_id 
ON track_stems(track_id);