-- Migration: Add Fal.AI support for song recognition and description
-- Description: Adds fal_request_id and provider columns to support Fal.AI alongside Mureka
-- Author: Migration to Fal.AI
-- Date: 2025-10-31

-- Add Fal.AI request tracking to song_recognitions
ALTER TABLE public.song_recognitions
  ADD COLUMN IF NOT EXISTS fal_request_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mureka';

-- Add Fal.AI request tracking to song_descriptions  
ALTER TABLE public.song_descriptions
  ADD COLUMN IF NOT EXISTS fal_request_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mureka';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_song_recognitions_fal_request_id 
  ON public.song_recognitions(fal_request_id) 
  WHERE fal_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_song_descriptions_fal_request_id 
  ON public.song_descriptions(fal_request_id) 
  WHERE fal_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_song_recognitions_provider 
  ON public.song_recognitions(provider);

CREATE INDEX IF NOT EXISTS idx_song_descriptions_provider 
  ON public.song_descriptions(provider);

-- Make mureka_task_id optional (nullable for Fal.AI records)
ALTER TABLE public.song_recognitions 
  ALTER COLUMN mureka_task_id DROP NOT NULL;

COMMENT ON COLUMN public.song_recognitions.fal_request_id IS 'Fal.AI request ID for tracking async tasks';
COMMENT ON COLUMN public.song_recognitions.provider IS 'AI provider: mureka or fal';
COMMENT ON COLUMN public.song_descriptions.fal_request_id IS 'Fal.AI request ID for tracking async tasks';
COMMENT ON COLUMN public.song_descriptions.provider IS 'AI provider: mureka or fal';