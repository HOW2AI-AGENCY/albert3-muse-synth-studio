-- ============================================
-- Phase 1: Projects System Schema
-- ============================================

-- 1. Check if music_projects exists and update if needed
-- Add missing columns to existing music_projects table
ALTER TABLE music_projects 
ADD COLUMN IF NOT EXISTS created_with_ai BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_generation_params JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Update trigger for last_activity_at
CREATE OR REPLACE FUNCTION update_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_music_projects_activity ON music_projects;
CREATE TRIGGER update_music_projects_activity
  BEFORE UPDATE ON music_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_activity();

-- 2. Project Tracks Association (many-to-many)
CREATE TABLE IF NOT EXISTS project_tracks (
  project_id UUID NOT NULL REFERENCES music_projects(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (project_id, track_id)
);

-- Enable RLS
ALTER TABLE project_tracks ENABLE ROW LEVEL SECURITY;

-- Policies for project_tracks
CREATE POLICY "Users can view project_tracks of own projects"
  ON project_tracks FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM music_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage project_tracks of own projects"
  ON project_tracks FOR ALL
  USING (
    project_id IN (
      SELECT id FROM music_projects WHERE user_id = auth.uid()
    )
  );

-- 3. Project Prompts
CREATE TABLE IF NOT EXISTS project_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES music_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('music', 'lyrics', 'style', 'concept')),
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE project_prompts ENABLE ROW LEVEL SECURITY;

-- Policies for project_prompts
CREATE POLICY "Users can view own prompts"
  ON project_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own prompts"
  ON project_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON project_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON project_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Cloud Folders for file organization
CREATE TABLE IF NOT EXISTS cloud_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES cloud_folders(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('audio', 'sample', 'effect', 'beat', 'general')),
  color TEXT,
  icon TEXT,
  is_favorite BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, parent_id, name)
);

-- Enable RLS
ALTER TABLE cloud_folders ENABLE ROW LEVEL SECURITY;

-- Policies for cloud_folders
CREATE POLICY "Users can manage own folders"
  ON cloud_folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Extend audio_library with new columns
ALTER TABLE audio_library
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('audio', 'sample', 'effect', 'beat')) DEFAULT 'audio',
ADD COLUMN IF NOT EXISTS bpm INTEGER CHECK (bpm > 0 AND bpm < 300),
ADD COLUMN IF NOT EXISTS key TEXT,
ADD COLUMN IF NOT EXISTS parent_folder_id UUID REFERENCES cloud_folders(id) ON DELETE SET NULL;

-- 6. Link saved_lyrics to projects (already exists, just ensure)
-- ALTER TABLE saved_lyrics ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES music_projects(id);
-- Already exists in schema

-- 7. Link suno_personas to projects (optional)
ALTER TABLE suno_personas 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES music_projects(id) ON DELETE SET NULL;

-- 8. Update tracks table with project_id reference (already exists)
-- ALTER TABLE tracks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES music_projects(id);
-- Already exists in schema

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_tracks_project ON project_tracks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tracks_track ON project_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_project_prompts_project ON project_prompts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_prompts_user ON project_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_project_prompts_category ON project_prompts(category);
CREATE INDEX IF NOT EXISTS idx_cloud_folders_user ON cloud_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_folders_parent ON cloud_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_audio_library_folder ON audio_library(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_audio_library_category ON audio_library(category);
CREATE INDEX IF NOT EXISTS idx_tracks_project ON tracks(project_id);
CREATE INDEX IF NOT EXISTS idx_saved_lyrics_project ON saved_lyrics(project_id);

-- 10. Create trigger for updating project stats when tracks are added/removed
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE music_projects
    SET 
      total_tracks = (
        SELECT COUNT(*) FROM project_tracks WHERE project_id = NEW.project_id
      ),
      completed_tracks = (
        SELECT COUNT(*) 
        FROM project_tracks pt
        JOIN tracks t ON pt.track_id = t.id
        WHERE pt.project_id = NEW.project_id AND t.status = 'completed'
      ),
      total_duration = (
        SELECT COALESCE(SUM(t.duration_seconds), 0)
        FROM project_tracks pt
        JOIN tracks t ON pt.track_id = t.id
        WHERE pt.project_id = NEW.project_id AND t.status = 'completed'
      ),
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE music_projects
    SET 
      total_tracks = (
        SELECT COUNT(*) FROM project_tracks WHERE project_id = OLD.project_id
      ),
      completed_tracks = (
        SELECT COUNT(*) 
        FROM project_tracks pt
        JOIN tracks t ON pt.track_id = t.id
        WHERE pt.project_id = OLD.project_id AND t.status = 'completed'
      ),
      total_duration = (
        SELECT COALESCE(SUM(t.duration_seconds), 0)
        FROM project_tracks pt
        JOIN tracks t ON pt.track_id = t.id
        WHERE pt.project_id = OLD.project_id AND t.status = 'completed'
      ),
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_stats ON project_tracks;
CREATE TRIGGER trigger_update_project_stats
  AFTER INSERT OR UPDATE OR DELETE ON project_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_stats();

-- 11. Create view for project details with stats
CREATE OR REPLACE VIEW project_details AS
SELECT 
  p.*,
  COUNT(DISTINCT pt.track_id) as actual_track_count,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN pt.track_id END) as actual_completed_count,
  COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.duration_seconds END), 0) as actual_total_duration,
  ARRAY_AGG(DISTINCT t.genre) FILTER (WHERE t.genre IS NOT NULL) as genres,
  ARRAY_AGG(DISTINCT t.mood) FILTER (WHERE t.mood IS NOT NULL) as moods
FROM music_projects p
LEFT JOIN project_tracks pt ON p.id = pt.project_id
LEFT JOIN tracks t ON pt.track_id = t.id
GROUP BY p.id;