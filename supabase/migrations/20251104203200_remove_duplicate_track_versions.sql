-- Migration: Remove duplicate track versions with variant_index = 0
-- Date: 2025-11-04
-- Issue: Track versions with variant_index = 0 duplicate the main track from tracks table
--
-- Context:
-- Prior to 2025-11-04, suno-callback created versions starting from variant_index = 0,
-- which duplicated the main track. The fixed callback now starts from variant_index = 1.
-- This migration cleans up old duplicate versions.
--
-- Safety: This migration only deletes versions with variant_index = 0, preserving all other versions.

BEGIN;

-- Log affected records before deletion
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM track_versions
  WHERE variant_index = 0;

  RAISE NOTICE 'Found % duplicate track versions with variant_index = 0', affected_count;
END $$;

-- Delete duplicate versions with variant_index = 0
-- These versions duplicate the main track stored in the tracks table
DELETE FROM track_versions
WHERE variant_index = 0;

-- Log completion
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM track_versions;

  RAISE NOTICE 'Migration complete. Remaining track versions: %', remaining_count;
END $$;

COMMIT;

-- Verification query (commented out - for manual testing):
-- SELECT
--   parent_track_id,
--   COUNT(*) as version_count,
--   array_agg(variant_index ORDER BY variant_index) as indexes
-- FROM track_versions
-- GROUP BY parent_track_id
-- ORDER BY parent_track_id;
