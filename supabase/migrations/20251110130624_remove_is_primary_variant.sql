-- Migration: Remove unused is_primary_variant column
-- Date: 2025-11-10
-- Purpose: Clean up unused field that was never utilized in the codebase
--
-- Context:
-- - is_primary_variant was added in migration 20251015144236
-- - Intended to mark the "primary" (original) variant
-- - Never used in application code (grep confirmed no usage)
-- - Caused confusion alongside is_preferred_variant
-- - With new architecture (variant_index >= 1), this field is obsolete
--
-- Safety:
-- - Field was never used, so removal has no impact
-- - Trigger set_primary_variant_on_first_insert() also needs removal
-- - Index idx_track_versions_primary needs removal

BEGIN;

-- Step 1: Drop trigger
DROP TRIGGER IF EXISTS trigger_set_primary_variant ON public.track_versions;

-- Step 2: Drop function
DROP FUNCTION IF EXISTS public.set_primary_variant_on_first_insert();

-- Step 3: Drop index
DROP INDEX IF EXISTS public.idx_track_versions_primary;

-- Step 4: Remove column
ALTER TABLE public.track_versions
DROP COLUMN IF EXISTS is_primary_variant;

-- Step 5: Log completion
RAISE NOTICE 'is_primary_variant column, trigger, and function removed successfully';

COMMIT;

-- Verification query (commented out - for manual testing):
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'track_versions'
-- AND table_schema = 'public'
-- ORDER BY ordinal_position;
