-- ============================================
-- MUSIC VIDEO GENERATION SUPPORT
-- Adds video generation tracking and status
-- ============================================

-- Add video task tracking to tracks metadata
COMMENT ON COLUMN public.tracks.metadata IS 'Extended JSONB metadata including:
- suno_id, mureka_task_id (provider task IDs)
- video_task_id (music video generation task ID)
- video_status (PENDING, PROCESSING, SUCCESS, FAILED)
- video_generated_at (timestamp)
- video_error (error details if failed)
- model_version, custom_mode
- AI analysis data (genre, mood, instruments, bpm)
- reference/extension data';

-- Create index for video generation queries
CREATE INDEX IF NOT EXISTS idx_tracks_video_metadata 
ON public.tracks USING gin ((metadata -> 'video_task_id'));

CREATE INDEX IF NOT EXISTS idx_tracks_video_status 
ON public.tracks ((metadata ->> 'video_status'));

-- Function to update video metadata
CREATE OR REPLACE FUNCTION public.update_track_video_metadata(
  p_track_id UUID,
  p_video_task_id TEXT DEFAULT NULL,
  p_video_url TEXT DEFAULT NULL,
  p_video_status TEXT DEFAULT NULL,
  p_video_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.tracks
  SET 
    video_url = COALESCE(p_video_url, video_url),
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{video_task_id}',
            to_jsonb(COALESCE(p_video_task_id, metadata->>'video_task_id')),
            true
          ),
          '{video_status}',
          to_jsonb(COALESCE(p_video_status, metadata->>'video_status')),
          true
        ),
        '{video_generated_at}',
        to_jsonb(NOW()::text),
        true
      ),
      '{video_error}',
      to_jsonb(p_video_error),
      true
    ),
    updated_at = NOW()
  WHERE id = p_track_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_track_video_metadata TO authenticated;