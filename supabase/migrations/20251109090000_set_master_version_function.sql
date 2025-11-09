-- Create transactional RPC function to set master version atomically
-- Includes helpful indexes to improve performance on common queries

BEGIN;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_track_versions_parent ON public.track_versions(parent_track_id);
CREATE INDEX IF NOT EXISTS idx_track_versions_preferred ON public.track_versions(is_preferred_variant);
CREATE INDEX IF NOT EXISTS idx_track_versions_variant_index ON public.track_versions(variant_index);

-- Function: set_master_version(parent_track_id uuid, version_id uuid)
-- Returns the updated track_versions row for the selected version
CREATE OR REPLACE FUNCTION public.set_master_version(
  parent_track_id uuid,
  version_id uuid
)
RETURNS SETOF public.track_versions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate that the version belongs to the specified parent track
  IF NOT EXISTS (
    SELECT 1
    FROM public.track_versions tv
    WHERE tv.id = version_id
      AND tv.parent_track_id = parent_track_id
  ) THEN
    RAISE EXCEPTION 'Version % does not belong to track %', version_id, parent_track_id
      USING ERRCODE = '22023';
  END IF;

  -- Unset preferred flag for all versions of this track
  UPDATE public.track_versions
  SET is_preferred_variant = false
  WHERE parent_track_id = parent_track_id;

  -- Set preferred flag for the selected version and return the updated row
  RETURN QUERY
  UPDATE public.track_versions
  SET is_preferred_variant = true
  WHERE id = version_id
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.set_master_version(uuid, uuid) IS 'Atomically sets master version for a track: resets preferred flags and marks the selected version.';

COMMIT;