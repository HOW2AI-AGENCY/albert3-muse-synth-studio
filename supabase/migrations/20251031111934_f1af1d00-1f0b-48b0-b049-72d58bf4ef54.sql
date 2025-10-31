-- Migration: Track Archiving System
-- Sprint 31 - Critical: Provider tracks expire after 15 days
-- Automatic archiving to Supabase Storage
-- Author: AI Assistant
-- Date: 2025-10-31

-- ============================================
-- PART 1: Add archiving metadata to tracks
-- ============================================

-- Add columns to track archiving status
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS archived_to_storage boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS storage_audio_url text,
ADD COLUMN IF NOT EXISTS storage_cover_url text,
ADD COLUMN IF NOT EXISTS storage_video_url text,
ADD COLUMN IF NOT EXISTS archive_scheduled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Create index for finding tracks that need archiving
CREATE INDEX IF NOT EXISTS idx_tracks_archive_scheduled 
ON public.tracks(archive_scheduled_at) 
WHERE archived_to_storage = false AND status = 'completed';

-- Create index for archived tracks
CREATE INDEX IF NOT EXISTS idx_tracks_archived 
ON public.tracks(archived_to_storage, archived_at DESC) 
WHERE archived_to_storage = true;

-- ============================================
-- PART 2: Archiving jobs table
-- ============================================

CREATE TABLE IF NOT EXISTS public.track_archiving_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- URLs before archiving
  original_audio_url text,
  original_cover_url text,
  original_video_url text,
  
  -- URLs after archiving
  storage_audio_url text,
  storage_cover_url text,
  storage_video_url text,
  
  -- Tracking
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT archiving_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_archiving_jobs_track_id ON public.track_archiving_jobs(track_id);
CREATE INDEX IF NOT EXISTS idx_archiving_jobs_status ON public.track_archiving_jobs(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_archiving_jobs_user_created ON public.track_archiving_jobs(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.track_archiving_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own archiving jobs"
  ON public.track_archiving_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage archiving jobs"
  ON public.track_archiving_jobs
  FOR ALL
  USING (true);

-- ============================================
-- PART 3: Functions for archiving management
-- ============================================

-- Function: Mark track for archiving (auto-schedule 13 days after creation)
CREATE OR REPLACE FUNCTION public.schedule_track_archiving()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Schedule archiving 13 days after creation (2 days before expiration)
  -- Only for completed tracks with external URLs
  IF NEW.status = 'completed' AND 
     NEW.audio_url IS NOT NULL AND 
     NEW.archived_to_storage = false THEN
    
    NEW.archive_scheduled_at = NEW.created_at + INTERVAL '13 days';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-scheduling
DROP TRIGGER IF EXISTS trigger_schedule_track_archiving ON public.tracks;
CREATE TRIGGER trigger_schedule_track_archiving
  BEFORE INSERT OR UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_track_archiving();

-- Function: Get tracks needing archiving
CREATE OR REPLACE FUNCTION public.get_tracks_needing_archiving(_limit integer DEFAULT 100)
RETURNS TABLE (
  track_id uuid,
  user_id uuid,
  title text,
  audio_url text,
  cover_url text,
  video_url text,
  created_at timestamp with time zone,
  days_until_expiry numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id as track_id,
    t.user_id,
    t.title,
    t.audio_url,
    t.cover_url,
    t.video_url,
    t.created_at,
    15 - EXTRACT(day FROM (now() - t.created_at))::numeric as days_until_expiry
  FROM public.tracks t
  WHERE t.status = 'completed'
    AND t.archived_to_storage = false
    AND t.audio_url IS NOT NULL
    AND (
      -- Tracks scheduled for archiving that are past due
      (t.archive_scheduled_at IS NOT NULL AND now() >= t.archive_scheduled_at)
      OR
      -- Tracks older than 13 days without schedule (safety net)
      (t.created_at < now() - INTERVAL '13 days')
    )
  ORDER BY t.created_at ASC
  LIMIT _limit;
$$;

-- Function: Mark track as archived
CREATE OR REPLACE FUNCTION public.mark_track_archived(
  _track_id uuid,
  _storage_audio_url text,
  _storage_cover_url text DEFAULT NULL,
  _storage_video_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tracks
  SET 
    archived_to_storage = true,
    storage_audio_url = _storage_audio_url,
    storage_cover_url = COALESCE(_storage_cover_url, storage_cover_url),
    storage_video_url = COALESCE(_storage_video_url, storage_video_url),
    archived_at = now()
  WHERE id = _track_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_tracks_needing_archiving(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_track_archived(uuid, text, text, text) TO authenticated;

-- ============================================
-- PART 4: Archive statistics view
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.archive_statistics AS
SELECT 
  COUNT(*) FILTER (WHERE archived_to_storage = true) as total_archived,
  COUNT(*) FILTER (WHERE archived_to_storage = false AND status = 'completed') as pending_archive,
  COUNT(*) FILTER (WHERE 
    archived_to_storage = false 
    AND status = 'completed'
    AND created_at < now() - INTERVAL '13 days'
  ) as urgent_archive_needed,
  COUNT(*) FILTER (WHERE 
    archived_to_storage = false 
    AND status = 'completed'
    AND created_at < now() - INTERVAL '15 days'
  ) as expired_tracks,
  SUM(
    CASE 
      WHEN archived_to_storage = true THEN 1 
      ELSE 0 
    END
  )::float / NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0) * 100 as archive_percentage
FROM public.tracks;

CREATE UNIQUE INDEX IF NOT EXISTS idx_archive_stats_single ON public.archive_statistics((true));

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.track_archiving_jobs IS 'Jobs for archiving tracks from provider to Supabase Storage (15-day expiration)';
COMMENT ON COLUMN public.tracks.archived_to_storage IS 'Whether track has been copied to Supabase Storage';
COMMENT ON COLUMN public.tracks.archive_scheduled_at IS 'When archiving is scheduled (13 days after creation)';
COMMENT ON FUNCTION public.get_tracks_needing_archiving(integer) IS 'Get tracks that need to be archived before 15-day expiration';
COMMENT ON FUNCTION public.mark_track_archived(uuid, text, text, text) IS 'Mark track as successfully archived to Storage';
