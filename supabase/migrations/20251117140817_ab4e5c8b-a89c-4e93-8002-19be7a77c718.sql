-- Fix SECURITY DEFINER warning for prompt_statistics view
-- Drop and recreate without SECURITY DEFINER (use RLS instead)
DROP VIEW IF EXISTS public.prompt_statistics;

CREATE OR REPLACE VIEW public.prompt_statistics 
WITH (security_invoker = true)
AS
SELECT
  ph.id,
  ph.prompt,
  ph.lyrics,
  ph.style_tags,
  ph.genre,
  ph.mood,
  ph.provider,
  ph.generation_status,
  ph.generation_time_ms,
  ph.model_version,
  ph.usage_count,
  ph.is_template,
  ph.template_name,
  ph.created_at,
  ph.last_used_at,
  ph.user_id,
  t.id as track_id,
  t.title as track_title,
  t.status as track_status,
  t.audio_url,
  t.cover_url,
  t.play_count,
  t.like_count,
  t.download_count
FROM public.prompt_history ph
LEFT JOIN public.tracks t ON ph.result_track_id = t.id
WHERE ph.user_id = auth.uid()
ORDER BY ph.last_used_at DESC;

-- Grant permissions
GRANT SELECT ON public.prompt_statistics TO authenticated;