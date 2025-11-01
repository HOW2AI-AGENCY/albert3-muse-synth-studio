-- Cleanup migration: Remove old Mureka variant_index=0 entries
-- These were created before the fix that prevents primary clip from being saved as a variant

-- Delete track_versions with variant_index=0 for Mureka tracks
-- (Primary clip should only be in the main tracks table, not in track_versions)
DELETE FROM public.track_versions
WHERE variant_index = 0
  AND parent_track_id IN (
    SELECT id FROM public.tracks WHERE provider = 'mureka'
  );

-- Also cleanup any track_versions without audio_url (incomplete saves)
DELETE FROM public.track_versions
WHERE audio_url IS NULL OR audio_url = '';

-- Add comment for documentation
COMMENT ON TABLE public.track_versions IS 'Track variants/versions. For Mureka: variant_index starts from 1 (primary is in tracks table). variant_index=0 entries are legacy data.';