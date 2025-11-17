-- ============================================================================
-- Security Fix: Set search_path for cleanup_old_classification_jobs function
-- ============================================================================
-- Issue: Function search_path mutable warning
-- Fix: Add SET search_path = 'public' to function definition
-- ============================================================================

DROP FUNCTION IF EXISTS public.cleanup_old_classification_jobs();

CREATE OR REPLACE FUNCTION public.cleanup_old_classification_jobs()
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completed/failed jobs older than 30 days
  WITH deleted AS (
    DELETE FROM public.classification_jobs
    WHERE 
      status IN ('completed', 'failed', 'cancelled')
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- Re-add comment
COMMENT ON FUNCTION public.cleanup_old_classification_jobs() IS 
  'Removes classification jobs older than 30 days (completed/failed only). Security Definer with search_path set.';