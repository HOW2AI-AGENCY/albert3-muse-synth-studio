-- Create DAW Projects table for storing Digital Audio Workstation projects
CREATE TABLE IF NOT EXISTS public.daw_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  bpm INTEGER DEFAULT 120,
  duration_seconds NUMERIC,
  track_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  last_saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daw_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own DAW projects"
  ON public.daw_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own DAW projects"
  ON public.daw_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own DAW projects"
  ON public.daw_projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own DAW projects"
  ON public.daw_projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public DAW projects viewable by everyone"
  ON public.daw_projects FOR SELECT
  USING (is_public = true);

-- Admins can view all
CREATE POLICY "Admins can view all DAW projects"
  ON public.daw_projects FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_daw_projects_user_id ON public.daw_projects(user_id);
CREATE INDEX idx_daw_projects_created_at ON public.daw_projects(created_at DESC);
CREATE INDEX idx_daw_projects_updated_at ON public.daw_projects(updated_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_daw_projects_updated_at
  BEFORE UPDATE ON public.daw_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();