-- Create track_versions table to store multiple versions of a track
CREATE TABLE IF NOT EXISTS public.track_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  is_master boolean DEFAULT false,
  suno_id text,
  audio_url text,
  video_url text,
  cover_url text,
  lyrics text,
  duration integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(parent_track_id, version_number)
);

-- Create track_stems table to store stems separated from tracks
CREATE TABLE IF NOT EXISTS public.track_stems (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.track_versions(id) ON DELETE CASCADE,
  stem_type text NOT NULL, -- 'vocals', 'instrumental', 'drums', 'bass', 'guitar', 'keyboard', 'strings', 'brass', 'woodwinds', 'percussion', 'synth', 'fx'
  separation_mode text NOT NULL, -- 'separate_vocal' or 'split_stem'
  audio_url text NOT NULL,
  suno_task_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.track_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_stems ENABLE ROW LEVEL SECURITY;

-- RLS policies for track_versions
CREATE POLICY "Users can view versions of their own tracks"
  ON public.track_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_versions.parent_track_id 
      AND tracks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view versions of public tracks"
  ON public.track_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_versions.parent_track_id 
      AND tracks.is_public = true
    )
  );

CREATE POLICY "Users can insert versions for their own tracks"
  ON public.track_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_versions.parent_track_id 
      AND tracks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update versions of their own tracks"
  ON public.track_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_versions.parent_track_id 
      AND tracks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete versions of their own tracks"
  ON public.track_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_versions.parent_track_id 
      AND tracks.user_id = auth.uid()
    )
  );

-- RLS policies for track_stems
CREATE POLICY "Users can view stems of their own tracks"
  ON public.track_stems FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_stems.track_id 
      AND tracks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view stems of public tracks"
  ON public.track_stems FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_stems.track_id 
      AND tracks.is_public = true
    )
  );

CREATE POLICY "Users can insert stems for their own tracks"
  ON public.track_stems FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_stems.track_id 
      AND tracks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete stems of their own tracks"
  ON public.track_stems FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_stems.track_id 
      AND tracks.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_track_versions_parent ON public.track_versions(parent_track_id);
CREATE INDEX idx_track_versions_master ON public.track_versions(parent_track_id, is_master) WHERE is_master = true;
CREATE INDEX idx_track_stems_track ON public.track_stems(track_id);
CREATE INDEX idx_track_stems_version ON public.track_stems(version_id);

-- Add has_stems flag to tracks table
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS has_stems boolean DEFAULT false;