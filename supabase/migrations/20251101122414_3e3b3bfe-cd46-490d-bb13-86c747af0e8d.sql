-- Create enum for project types
CREATE TYPE project_type AS ENUM (
  'single', 
  'ep', 
  'album', 
  'soundtrack', 
  'instrumental', 
  'custom'
);

-- Create music_projects table
CREATE TABLE public.music_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  project_type project_type NOT NULL DEFAULT 'single',
  persona_id UUID REFERENCES public.suno_personas(id) ON DELETE SET NULL,
  
  -- Style and concept
  style_tags TEXT[],
  genre TEXT,
  mood TEXT,
  tempo_range JSONB,
  concept_description TEXT,
  story_theme TEXT,
  visual_references TEXT[],
  
  -- Tracklist planning
  planned_tracks JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Statistics
  total_tracks INTEGER DEFAULT 0,
  completed_tracks INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_music_projects_user_id ON public.music_projects(user_id);
CREATE INDEX idx_music_projects_persona_id ON public.music_projects(persona_id);
CREATE INDEX idx_music_projects_type ON public.music_projects(project_type);

-- Enable RLS
ALTER TABLE public.music_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects"
  ON music_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON music_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON music_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON music_projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public projects viewable by everyone"
  ON music_projects FOR SELECT
  USING (is_public = true);

-- Add project_id to tracks table
ALTER TABLE public.tracks 
ADD COLUMN project_id UUID REFERENCES public.music_projects(id) ON DELETE SET NULL;

CREATE INDEX idx_tracks_project_id ON public.tracks(project_id);

-- Trigger to update project statistics
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_project_id UUID;
BEGIN
  -- Get the project_id from the appropriate row
  IF TG_OP = 'DELETE' THEN
    target_project_id := OLD.project_id;
  ELSE
    target_project_id := NEW.project_id;
  END IF;

  -- Skip if no project is associated
  IF target_project_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Update project statistics
  UPDATE public.music_projects
  SET 
    total_tracks = (
      SELECT COUNT(*) 
      FROM tracks 
      WHERE project_id = target_project_id
    ),
    completed_tracks = (
      SELECT COUNT(*) 
      FROM tracks 
      WHERE project_id = target_project_id 
        AND status = 'completed'
    ),
    total_duration = (
      SELECT COALESCE(SUM(duration_seconds), 0)
      FROM tracks 
      WHERE project_id = target_project_id 
        AND status = 'completed'
    ),
    updated_at = NOW()
  WHERE id = target_project_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tracks_update_project_stats
  AFTER INSERT OR UPDATE OR DELETE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_stats();