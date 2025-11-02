-- Fix function search_path for security
CREATE OR REPLACE FUNCTION public.update_project_track_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.project_id IS NOT NULL THEN
      UPDATE public.music_projects
      SET 
        total_tracks = COALESCE(total_tracks, 0) + 1,
        completed_tracks = CASE WHEN NEW.status = 'completed' THEN COALESCE(completed_tracks, 0) + 1 ELSE COALESCE(completed_tracks, 0) END,
        total_duration = COALESCE(total_duration, 0) + COALESCE(NEW.duration_seconds, 0)
      WHERE id = NEW.project_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle project change
    IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
      -- Decrement from old project
      IF OLD.project_id IS NOT NULL THEN
        UPDATE public.music_projects
        SET 
          total_tracks = GREATEST(COALESCE(total_tracks, 1) - 1, 0),
          completed_tracks = CASE WHEN OLD.status = 'completed' THEN GREATEST(COALESCE(completed_tracks, 1) - 1, 0) ELSE COALESCE(completed_tracks, 0) END,
          total_duration = GREATEST(COALESCE(total_duration, 0) - COALESCE(OLD.duration_seconds, 0), 0)
        WHERE id = OLD.project_id;
      END IF;
      
      -- Increment in new project
      IF NEW.project_id IS NOT NULL THEN
        UPDATE public.music_projects
        SET 
          total_tracks = COALESCE(total_tracks, 0) + 1,
          completed_tracks = CASE WHEN NEW.status = 'completed' THEN COALESCE(completed_tracks, 0) + 1 ELSE COALESCE(completed_tracks, 0) END,
          total_duration = COALESCE(total_duration, 0) + COALESCE(NEW.duration_seconds, 0)
        WHERE id = NEW.project_id;
      END IF;
    -- Handle status change only
    ELSIF OLD.status != NEW.status AND NEW.project_id IS NOT NULL THEN
      IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE public.music_projects
        SET completed_tracks = COALESCE(completed_tracks, 0) + 1
        WHERE id = NEW.project_id;
      ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        UPDATE public.music_projects
        SET completed_tracks = GREATEST(COALESCE(completed_tracks, 1) - 1, 0)
        WHERE id = NEW.project_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.project_id IS NOT NULL THEN
      UPDATE public.music_projects
      SET 
        total_tracks = GREATEST(COALESCE(total_tracks, 1) - 1, 0),
        completed_tracks = CASE WHEN OLD.status = 'completed' THEN GREATEST(COALESCE(completed_tracks, 1) - 1, 0) ELSE COALESCE(completed_tracks, 0) END,
        total_duration = GREATEST(COALESCE(total_duration, 0) - COALESCE(OLD.duration_seconds, 0), 0)
      WHERE id = OLD.project_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;