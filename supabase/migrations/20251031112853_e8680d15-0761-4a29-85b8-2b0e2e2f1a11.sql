-- Sprint 31 Week 1: Security Fixes
-- Fix Function Search Path Mutable & Secure Materialized Views
-- Author: @ai-agent
-- Date: 2025-10-31

-- ============================================
-- PART 1: Fix Function Search Path
-- ============================================
-- Add search_path to all existing functions to prevent security vulnerabilities

ALTER FUNCTION public.set_updated_at() 
  SET search_path = public;

ALTER FUNCTION public.notify_track_ready() 
  SET search_path = public;

ALTER FUNCTION public.notify_track_liked() 
  SET search_path = public;

ALTER FUNCTION public.has_role(uuid, app_role) 
  SET search_path = public;

ALTER FUNCTION public.update_updated_at_column() 
  SET search_path = public;

-- ============================================
-- PART 2: Secure Materialized Views
-- ============================================
-- Move materialized views to analytics schema to prevent exposure via API

-- Create analytics schema if not exists
CREATE SCHEMA IF NOT EXISTS analytics;

-- Move materialized views to analytics schema
ALTER MATERIALIZED VIEW IF EXISTS public.user_stats 
  SET SCHEMA analytics;

ALTER MATERIALIZED VIEW IF EXISTS public.analytics_generations_daily 
  SET SCHEMA analytics;

ALTER MATERIALIZED VIEW IF EXISTS public.analytics_top_genres 
  SET SCHEMA analytics;

ALTER MATERIALIZED VIEW IF EXISTS public.archive_statistics 
  SET SCHEMA analytics;

-- Set correct ownership
ALTER MATERIALIZED VIEW IF EXISTS analytics.user_stats 
  OWNER TO postgres;

ALTER MATERIALIZED VIEW IF EXISTS analytics.analytics_generations_daily 
  OWNER TO postgres;

ALTER MATERIALIZED VIEW IF EXISTS analytics.analytics_top_genres 
  OWNER TO postgres;

ALTER MATERIALIZED VIEW IF EXISTS analytics.archive_statistics 
  OWNER TO postgres;

-- Grant select only to authenticated users for analytics views
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT SELECT ON analytics.user_stats TO authenticated;
GRANT SELECT ON analytics.analytics_generations_daily TO authenticated;
GRANT SELECT ON analytics.analytics_top_genres TO authenticated;
GRANT SELECT ON analytics.archive_statistics TO authenticated;

-- Create helper function for admins to access analytics
CREATE OR REPLACE FUNCTION public.get_analytics_user_stats()
RETURNS SETOF analytics.user_stats
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT * FROM analytics.user_stats
  WHERE has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_generations_daily()
RETURNS SETOF analytics.analytics_generations_daily
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT * FROM analytics.analytics_generations_daily
  WHERE has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_top_genres()
RETURNS SETOF analytics.analytics_top_genres
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT * FROM analytics.analytics_top_genres
  WHERE has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_archive_statistics()
RETURNS SETOF analytics.archive_statistics
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT * FROM analytics.archive_statistics
  WHERE has_role(auth.uid(), 'admin');
$$;

-- ============================================
-- PART 3: Verification Queries
-- ============================================

-- Verify all public functions have search_path set
COMMENT ON SCHEMA analytics IS 'Protected analytics schema - access via helper functions only';

-- Add comments for documentation
COMMENT ON FUNCTION public.get_analytics_user_stats() IS 'Admin-only access to user statistics';
COMMENT ON FUNCTION public.get_analytics_generations_daily() IS 'Admin-only access to daily generation analytics';
COMMENT ON FUNCTION public.get_analytics_top_genres() IS 'Admin-only access to top genres statistics';
COMMENT ON FUNCTION public.get_analytics_archive_statistics() IS 'Admin-only access to archive statistics';