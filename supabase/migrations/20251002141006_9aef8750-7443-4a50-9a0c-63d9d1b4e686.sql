-- Add index for faster track queries by user and status
CREATE INDEX IF NOT EXISTS idx_tracks_user_status ON public.tracks(user_id, status);

-- Add index for faster track queries by user and created_at
CREATE INDEX IF NOT EXISTS idx_tracks_user_created ON public.tracks(user_id, created_at DESC);

-- Add index for public tracks
CREATE INDEX IF NOT EXISTS idx_tracks_public ON public.tracks(is_public) WHERE is_public = true;

-- Add index for suno task id lookups
CREATE INDEX IF NOT EXISTS idx_tracks_suno_task ON public.tracks((metadata->>'suno_task_id')) WHERE provider = 'suno';