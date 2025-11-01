-- Migration: Mark stuck Fal.AI tasks as failed
-- Description: Clean up processing tasks that are stuck due to Fal.AI balance exhaustion
-- Author: System
-- Date: 2025-11-01

-- Mark stuck song_recognitions as failed
UPDATE song_recognitions
SET 
  status = 'failed',
  error_message = 'Fal.AI service unavailable. Please try again later or contact support.',
  updated_at = NOW()
WHERE status = 'processing'
  AND provider = 'fal'
  AND created_at < NOW() - INTERVAL '1 hour';

-- Mark stuck song_descriptions as failed  
UPDATE song_descriptions
SET
  status = 'failed',
  error_message = 'Fal.AI service unavailable. Please try again later or contact support.',
  updated_at = NOW()
WHERE status = 'processing'
  AND provider = 'fal'
  AND created_at < NOW() - INTERVAL '1 hour';