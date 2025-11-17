-- 1. Add result_track_id for linking prompts to generated tracks
ALTER TABLE public.prompt_history
ADD COLUMN IF NOT EXISTS result_track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL;

-- 2. Add generation metrics
ALTER TABLE public.prompt_history
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS model_version TEXT;

-- 3. Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_prompt_history_status ON public.prompt_history(generation_status);
CREATE INDEX IF NOT EXISTS idx_prompt_history_result_track ON public.prompt_history(result_track_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_created ON public.prompt_history(user_id, created_at DESC);

-- 4. Create view for statistics (prompts with track results)
CREATE OR REPLACE VIEW public.prompt_statistics AS
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
ORDER BY ph.last_used_at DESC;

-- 5. Grant permissions
GRANT SELECT ON public.prompt_statistics TO authenticated;

-- 6. Add source_prompt_id to tracks for bidirectional linking (optional)
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS source_prompt_id UUID REFERENCES public.prompt_history(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tracks_source_prompt ON public.tracks(source_prompt_id);