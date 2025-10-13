-- TASK-3.2: Add Missing Database Indexes for Performance
-- Improves query speed for frequently accessed patterns

-- Index for user's tracks filtered by status
CREATE INDEX IF NOT EXISTS idx_tracks_user_status 
ON public.tracks(user_id, status) 
WHERE status IN ('pending', 'processing', 'completed');

-- Index for Suno task ID lookups
CREATE INDEX IF NOT EXISTS idx_tracks_metadata_suno_task_id 
ON public.tracks USING gin ((metadata -> 'suno_task_id'));

-- Index for Mureka task ID lookups  
CREATE INDEX IF NOT EXISTS idx_tracks_metadata_mureka_task_id
ON public.tracks USING gin ((metadata -> 'mureka_task_id'));

-- Index for provider filtering with status
CREATE INDEX IF NOT EXISTS idx_tracks_provider_status
ON public.tracks(provider, status)
WHERE provider IN ('suno', 'mureka');

-- Index for public tracks discovery
CREATE INDEX IF NOT EXISTS idx_tracks_public_created
ON public.tracks(is_public, created_at DESC)
WHERE is_public = true;

-- Index for lyrics jobs by user and status
CREATE INDEX IF NOT EXISTS idx_lyrics_jobs_user_status
ON public.lyrics_jobs(user_id, status)
WHERE status IN ('pending', 'processing');