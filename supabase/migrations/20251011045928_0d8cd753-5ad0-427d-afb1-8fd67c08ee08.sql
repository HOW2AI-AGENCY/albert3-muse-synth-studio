-- Add database indexes for performance optimization

-- Index for tracks by suno_task_id in metadata (for polling queries)
CREATE INDEX IF NOT EXISTS idx_tracks_suno_task_id 
  ON tracks((metadata->>'suno_task_id'))
  WHERE metadata->>'suno_task_id' IS NOT NULL;

-- Index for tracks by stem_task_id in metadata
CREATE INDEX IF NOT EXISTS idx_tracks_stem_task_id 
  ON tracks((metadata->>'stem_task_id'))
  WHERE metadata->>'stem_task_id' IS NOT NULL;

-- Index for lyrics_jobs by suno_task_id (for callback lookups)
CREATE INDEX IF NOT EXISTS idx_lyrics_jobs_suno_task_id 
  ON lyrics_jobs(suno_task_id)
  WHERE suno_task_id IS NOT NULL;

-- Index for tracks filtering by status and user_id (for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_tracks_status_user_id 
  ON tracks(status, user_id) 
  WHERE status IN ('pending', 'processing');

-- Index for track_stems by track_id and separation_mode (for stem queries)
CREATE INDEX IF NOT EXISTS idx_track_stems_track_id_mode
  ON track_stems(track_id, separation_mode);

-- Index for notifications by user_id and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read, created_at DESC);

-- Comment explaining indexes
COMMENT ON INDEX idx_tracks_suno_task_id IS 'Speeds up polling queries for Suno task status';
COMMENT ON INDEX idx_tracks_status_user_id IS 'Optimizes dashboard queries for processing tracks';
COMMENT ON INDEX idx_track_stems_track_id_mode IS 'Speeds up stem lookup by track and separation mode';