-- Drop triggers first (must come before dropping functions)
DROP TRIGGER IF EXISTS update_music_projects_activity ON public.music_projects;
DROP TRIGGER IF EXISTS trigger_update_project_stats ON public.project_tracks;

-- Drop the old view if it exists
DROP VIEW IF EXISTS public.project_details;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_project_activity();
DROP FUNCTION IF EXISTS public.update_project_stats();

-- Recreate update_project_activity function
CREATE OR REPLACE FUNCTION public.update_project_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate trigger for update_project_activity
CREATE TRIGGER update_music_projects_activity
  BEFORE UPDATE ON public.music_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_activity();

-- Recreate update_project_stats function  
CREATE OR REPLACE FUNCTION public.update_project_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Recreate trigger for update_project_stats
CREATE TRIGGER trigger_update_project_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.project_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_stats();

-- Create get_project_details function to replace view
CREATE OR REPLACE FUNCTION public.get_project_details(project_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  project_type TEXT,
  cover_url TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  total_tracks INTEGER,
  completed_tracks INTEGER,
  total_duration INTEGER,
  style_tags TEXT[],
  genre TEXT,
  mood TEXT,
  created_with_ai BOOLEAN,
  ai_generation_params JSONB,
  actual_track_count BIGINT,
  actual_completed_count BIGINT,
  actual_total_duration NUMERIC,
  genres TEXT[],
  moods TEXT[]
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.name,
    p.description,
    p.project_type::TEXT,
    p.cover_url,
    p.is_public,
    p.created_at,
    p.updated_at,
    p.last_activity_at,
    p.total_tracks,
    p.completed_tracks,
    p.total_duration,
    p.style_tags,
    p.genre,
    p.mood,
    p.created_with_ai,
    p.ai_generation_params,
    COUNT(DISTINCT pt.track_id) as actual_track_count,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN pt.track_id END) as actual_completed_count,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.duration_seconds END), 0) as actual_total_duration,
    ARRAY_AGG(DISTINCT t.genre) FILTER (WHERE t.genre IS NOT NULL) as genres,
    ARRAY_AGG(DISTINCT t.mood) FILTER (WHERE t.mood IS NOT NULL) as moods
  FROM music_projects p
  LEFT JOIN project_tracks pt ON p.id = pt.project_id
  LEFT JOIN tracks t ON pt.track_id = t.id
  WHERE (project_user_id IS NULL OR p.user_id = project_user_id)
    AND (p.user_id = auth.uid() OR p.is_public = true)
  GROUP BY p.id;
$$;