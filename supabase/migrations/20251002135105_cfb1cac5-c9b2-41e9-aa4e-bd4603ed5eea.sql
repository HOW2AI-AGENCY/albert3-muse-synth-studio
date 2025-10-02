-- Add new columns to tracks table for complete Suno metadata
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS suno_id TEXT,
ADD COLUMN IF NOT EXISTS model_name TEXT,
ADD COLUMN IF NOT EXISTS created_at_suno TIMESTAMP WITH TIME ZONE;

-- Add index for suno_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tracks_suno_id ON public.tracks(suno_id);

-- Add comment for documentation
COMMENT ON COLUMN public.tracks.cover_url IS 'URL of the AI-generated track cover image from Suno';
COMMENT ON COLUMN public.tracks.video_url IS 'URL of the video version from Suno';
COMMENT ON COLUMN public.tracks.suno_id IS 'Unique ID from Suno API for this track';
COMMENT ON COLUMN public.tracks.model_name IS 'Suno model used for generation (e.g., V5)';
COMMENT ON COLUMN public.tracks.created_at_suno IS 'Timestamp when track was created in Suno system';