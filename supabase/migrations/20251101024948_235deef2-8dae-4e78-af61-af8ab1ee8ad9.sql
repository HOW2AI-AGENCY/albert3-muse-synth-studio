-- Очистка зависших Mureka задач в song_descriptions
-- Phase 1: Critical Fixes - Cleanup stuck Mureka analysis tasks

UPDATE song_descriptions
SET 
  status = 'failed',
  error_message = 'Analysis timed out. Please try again.',
  updated_at = NOW()
WHERE 
  status = 'processing' 
  AND provider = 'mureka'
  AND created_at < NOW() - INTERVAL '1 hour';

UPDATE song_recognitions
SET 
  status = 'failed',
  error_message = 'Recognition timed out. Please try again.',
  updated_at = NOW()
WHERE 
  status = 'processing' 
  AND provider = 'mureka'
  AND created_at < NOW() - INTERVAL '1 hour';