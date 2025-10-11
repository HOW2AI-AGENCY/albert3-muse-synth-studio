-- Migration: Fix search_path in database functions
-- Date: 2025-10-11
-- Description: Add SET search_path to update_updated_at_column and update_lyrics_jobs_updated_at functions
-- This fixes security warnings about mutable search_path

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_lyrics_jobs_updated_at function
CREATE OR REPLACE FUNCTION public.update_lyrics_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;