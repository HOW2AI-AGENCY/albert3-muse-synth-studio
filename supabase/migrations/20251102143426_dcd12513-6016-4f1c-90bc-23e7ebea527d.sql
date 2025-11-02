-- Create studio_projects table
CREATE TABLE IF NOT EXISTS public.studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bpm INTEGER DEFAULT 120,
  time_signature TEXT DEFAULT '4/4',
  snap_enabled BOOLEAN DEFAULT true,
  snap_to TEXT DEFAULT 'beat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create studio_project_tracks table
CREATE TABLE IF NOT EXISTS public.studio_project_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id),
  name TEXT NOT NULL,
  audio_url TEXT,
  start_time NUMERIC DEFAULT 0,
  trim_start NUMERIC DEFAULT 0,
  trim_end NUMERIC DEFAULT 0,
  volume NUMERIC DEFAULT 1,
  pan NUMERIC DEFAULT 0,
  color TEXT,
  muted BOOLEAN DEFAULT false,
  solo BOOLEAN DEFAULT false,
  effects JSONB DEFAULT '[]'::jsonb,
  automation JSONB DEFAULT '{}'::jsonb,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_project_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for studio_projects
CREATE POLICY "Users can view own projects"
  ON public.studio_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON public.studio_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.studio_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.studio_projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for studio_project_tracks
CREATE POLICY "Users can view own project tracks"
  ON public.studio_project_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_projects
      WHERE studio_projects.id = studio_project_tracks.project_id
      AND studio_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project tracks"
  ON public.studio_project_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studio_projects
      WHERE studio_projects.id = studio_project_tracks.project_id
      AND studio_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project tracks"
  ON public.studio_project_tracks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_projects
      WHERE studio_projects.id = studio_project_tracks.project_id
      AND studio_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project tracks"
  ON public.studio_project_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_projects
      WHERE studio_projects.id = studio_project_tracks.project_id
      AND studio_projects.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_studio_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_studio_projects_updated_at
  BEFORE UPDATE ON public.studio_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_studio_project_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_studio_projects_user_id ON public.studio_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_project_tracks_project_id ON public.studio_project_tracks(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_project_tracks_track_id ON public.studio_project_tracks(track_id);