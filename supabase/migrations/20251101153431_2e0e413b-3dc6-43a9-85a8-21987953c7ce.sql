-- Fix function search path
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