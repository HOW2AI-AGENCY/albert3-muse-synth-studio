-- Migration: Add idempotency_key to tracks and optimize indexes
-- Description: Phase 1 of performance optimization - simplify database schema
-- Author: Performance optimization sprint
-- Date: 2025-10-18

-- Step 1: Add idempotency_key column to tracks
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- Step 2: Create index for idempotency_key
CREATE INDEX IF NOT EXISTS idx_tracks_idempotency_key 
ON public.tracks(idempotency_key);

-- Step 3: Migrate existing data from ai_jobs to tracks
UPDATE public.tracks t
SET idempotency_key = aj.idempotency_key
FROM public.ai_jobs aj
WHERE t.id::text = aj.external_id
  AND t.idempotency_key IS NULL;

-- Step 4: Create composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_tracks_user_status 
ON public.tracks(user_id, status) 
WHERE status IN ('pending', 'processing');

-- Step 5: Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_tracks_metadata_suno_task 
ON public.tracks USING gin (metadata) 
WHERE (metadata->>'suno_task_id') IS NOT NULL;

-- Step 6: Create partial index for recovery queries
CREATE INDEX IF NOT EXISTS idx_tracks_pending_recovery
ON public.tracks(user_id, created_at)
WHERE status = 'pending' AND suno_id IS NULL;

-- Step 7: Add comment for documentation
COMMENT ON COLUMN public.tracks.idempotency_key IS 
'Unique key for deduplication of generation requests. Replaces ai_jobs table functionality.';

-- Step 8: Drop ai_jobs table as it's now redundant
DROP TABLE IF EXISTS public.ai_jobs CASCADE;