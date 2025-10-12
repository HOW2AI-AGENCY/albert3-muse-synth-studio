-- Migration: Fix search_path for get_user_mureka_stats function
-- Description: Add SET search_path = 'public' to prevent SQL injection vulnerabilities
-- Author: System Security Hardening
-- Date: 2025-10-12

-- Drop and recreate function with proper search_path
DROP FUNCTION IF EXISTS public.get_user_mureka_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_user_mureka_stats(user_uuid uuid)
RETURNS TABLE(
  total_tracks integer, 
  total_recognitions integer, 
  total_descriptions integer, 
  successful_recognitions integer, 
  avg_recognition_confidence numeric
)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'  -- CRITICAL: Prevents SQL injection via search_path manipulation
AS $$
  SELECT 
    COUNT(DISTINCT t.id)::INTEGER AS total_tracks,
    COUNT(DISTINCT r.id)::INTEGER AS total_recognitions,
    COUNT(DISTINCT d.id)::INTEGER AS total_descriptions,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed')::INTEGER AS successful_recognitions,
    AVG(r.confidence_score) FILTER (WHERE r.status = 'completed') AS avg_recognition_confidence
  FROM public.tracks t
  FULL OUTER JOIN public.song_recognitions r ON r.user_id = user_uuid
  FULL OUTER JOIN public.song_descriptions d ON d.user_id = user_uuid
  WHERE t.user_id = user_uuid AND t.provider = 'mureka';
$$;

COMMENT ON FUNCTION public.get_user_mureka_stats IS 'Returns Mureka usage statistics for a user. Secured with SET search_path to prevent injection attacks.';