-- ✅ P1: Performance Optimizations (Fixed version without pg_trgm)
-- 1. Create rate_limit_buckets table for advanced rate limiting
-- 2. Add database indexes for frequently queried columns
-- 3. Create helper functions for batch operations

-- Rate limit buckets table
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  tokens INTEGER NOT NULL DEFAULT 0,
  last_refill BIGINT NOT NULL,
  window_start BIGINT NOT NULL,
  last_request BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by key
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_key ON public.rate_limit_buckets(key);

-- Index for cleanup (old records)
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_last_request ON public.rate_limit_buckets(last_request);

-- Enable RLS
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin only for rate limits)
CREATE POLICY "Admins can view rate limits"
  ON public.rate_limit_buckets FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage rate limits"
  ON public.rate_limit_buckets FOR ALL
  USING (true)
  WITH CHECK (true);

-- Performance indexes for tracks table
CREATE INDEX IF NOT EXISTS idx_tracks_user_id_status ON public.tracks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id_created_at ON public.tracks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_provider_status ON public.tracks(provider, status);
CREATE INDEX IF NOT EXISTS idx_tracks_mureka_task_id ON public.tracks(mureka_task_id) WHERE mureka_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_suno_id ON public.tracks(suno_id) WHERE suno_id IS NOT NULL;

-- Performance indexes for music_projects table
CREATE INDEX IF NOT EXISTS idx_projects_user_id_last_activity ON public.music_projects(user_id, last_activity_at DESC);

-- Performance indexes for track_versions table
CREATE INDEX IF NOT EXISTS idx_track_versions_parent_id ON public.track_versions(parent_track_id);

-- Performance indexes for track_stems table
CREATE INDEX IF NOT EXISTS idx_track_stems_track_id ON public.track_stems(track_id);

-- Helper function for batch counter increments
CREATE OR REPLACE FUNCTION public.batch_increment_counter(
  track_ids UUID[],
  field_name TEXT,
  amounts INTEGER[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(track_ids, 1) LOOP
    EXECUTE format('UPDATE tracks SET %I = COALESCE(%I, 0) + $1 WHERE id = $2', field_name, field_name)
    USING amounts[i], track_ids[i];
  END LOOP;
END;
$$;

-- Helper function for project stats aggregation
CREATE OR REPLACE FUNCTION public.get_project_stats(p_project_id UUID)
RETURNS TABLE (
  total BIGINT,
  completed BIGINT,
  processing BIGINT,
  failed BIGINT,
  total_duration INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
    COUNT(*) FILTER (WHERE t.status = 'processing') as processing,
    COUNT(*) FILTER (WHERE t.status = 'failed') as failed,
    COALESCE(SUM(t.duration_seconds) FILTER (WHERE t.status = 'completed'), 0)::INTEGER as total_duration
  FROM project_tracks pt
  JOIN tracks t ON pt.track_id = t.id
  WHERE pt.project_id = p_project_id;
$$;

-- Trigger to auto-update updated_at on rate_limit_buckets
CREATE TRIGGER update_rate_limit_buckets_updated_at
BEFORE UPDATE ON public.rate_limit_buckets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();