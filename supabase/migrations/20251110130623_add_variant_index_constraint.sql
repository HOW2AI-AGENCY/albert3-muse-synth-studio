-- Migration: Add constraint to ensure variant_index >= 1
-- Date: 2025-11-10
-- Purpose: Prevent creation of variant_index = 0 (main track should only be in tracks table)
--
-- Context:
-- Prior refactoring established that:
-- - Main track (original) → tracks table (audio_url, cover_url, etc.)
-- - Variants (alternatives) → track_versions table (variant_index >= 1)
-- - Version 0 was creating confusion and duplication
--
-- This constraint enforces the architectural decision at the database level.

BEGIN;

-- Step 1: Remove any existing variants with variant_index = 0 (cleanup)
-- These are legacy entries that duplicate the main track
DELETE FROM public.track_versions
WHERE variant_index = 0;

-- Step 2: Add CHECK constraint to prevent future variant_index = 0
-- This ensures variant_index is always >= 1
ALTER TABLE public.track_versions
DROP CONSTRAINT IF EXISTS track_versions_variant_index_positive;

ALTER TABLE public.track_versions
ADD CONSTRAINT track_versions_variant_index_positive
CHECK (variant_index >= 1);

-- Step 3: Update table comment
COMMENT ON TABLE public.track_versions IS
  'Track variants/versions table. variant_index MUST be >= 1. Main track (original) is stored in tracks table, not here.';

COMMENT ON COLUMN public.track_versions.variant_index IS
  'Variant number (1, 2, 3...). CONSTRAINT: variant_index >= 1. Version 0 is NOT allowed - main track is in tracks table.';

-- Step 4: Log completion
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM public.track_versions;
  RAISE NOTICE 'Constraint added successfully. Remaining variants: %', remaining_count;
END $$;

COMMIT;

-- Verification query (commented out - for manual testing):
-- SELECT parent_track_id, COUNT(*), MIN(variant_index), MAX(variant_index)
-- FROM track_versions
-- GROUP BY parent_track_id
-- ORDER BY parent_track_id;
