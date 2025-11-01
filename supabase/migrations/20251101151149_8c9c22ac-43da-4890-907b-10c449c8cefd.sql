-- Migration: Add timestamped_lyrics support and create track_section_replacements table

-- 1. Create track_section_replacements table
CREATE TABLE IF NOT EXISTS public.track_section_replacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.track_versions(id) ON DELETE SET NULL,
  
  -- Replaced section time range
  replaced_start_s NUMERIC(10, 2) NOT NULL,
  replaced_end_s NUMERIC(10, 2) NOT NULL,
  
  -- Replacement parameters
  prompt TEXT NOT NULL,
  tags TEXT NOT NULL,
  negative_tags TEXT,
  
  -- Result
  suno_task_id TEXT,
  replacement_audio_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (replaced_start_s >= 0),
  CHECK (replaced_end_s > replaced_start_s),
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- 2. Create indexes for track_section_replacements
CREATE INDEX IF NOT EXISTS idx_track_section_replacements_parent 
  ON public.track_section_replacements(parent_track_id);

CREATE INDEX IF NOT EXISTS idx_track_section_replacements_status 
  ON public.track_section_replacements(status);

CREATE INDEX IF NOT EXISTS idx_track_section_replacements_task 
  ON public.track_section_replacements(suno_task_id);

-- 3. Enable RLS for track_section_replacements
ALTER TABLE public.track_section_replacements ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for track_section_replacements
CREATE POLICY "Users can view own replacements"
  ON public.track_section_replacements FOR SELECT
  USING (
    parent_track_id IN (
      SELECT id FROM public.tracks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own replacements"
  ON public.track_section_replacements FOR INSERT
  WITH CHECK (
    parent_track_id IN (
      SELECT id FROM public.tracks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all replacements"
  ON public.track_section_replacements FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- 5. Create updated_at trigger
CREATE TRIGGER update_track_section_replacements_updated_at
  BEFORE UPDATE ON public.track_section_replacements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create view for tracks with timestamped lyrics
CREATE OR REPLACE VIEW public.tracks_with_timestamped_lyrics AS
SELECT 
  id,
  title,
  audio_url,
  lyrics,
  metadata->'timestamped_lyrics' AS timestamped_lyrics,
  CASE 
    WHEN metadata->'timestamped_lyrics' IS NOT NULL 
    THEN true 
    ELSE false 
  END AS has_timestamped_lyrics
FROM public.tracks
WHERE status = 'completed'
  AND lyrics IS NOT NULL;