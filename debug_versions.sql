-- Diagnostic query to investigate version duplication issue
-- Run this in Supabase SQL Editor

-- 1. Check track_versions for a specific track (replace with actual track ID)
SELECT
  tv.id,
  tv.parent_track_id,
  tv.variant_index,
  tv.is_primary_variant,
  tv.is_preferred_variant,
  tv.suno_id,
  LEFT(tv.audio_url, 50) as audio_url_preview,
  tv.created_at
FROM track_versions tv
WHERE tv.parent_track_id = 'YOUR_TRACK_ID_HERE'
ORDER BY tv.variant_index;

-- 2. Check main track
SELECT
  t.id,
  t.title,
  t.suno_id,
  LEFT(t.audio_url, 50) as audio_url_preview,
  t.status,
  t.created_at,
  jsonb_array_length(COALESCE(t.metadata->'suno_data', '[]'::jsonb)) as suno_data_count
FROM tracks t
WHERE t.id = 'YOUR_TRACK_ID_HERE';

-- 3. Find tracks with multiple versions
SELECT
  tv.parent_track_id,
  COUNT(*) as version_count,
  array_agg(tv.variant_index ORDER BY tv.variant_index) as variant_indexes,
  array_agg(tv.suno_id ORDER BY tv.variant_index) as suno_ids
FROM track_versions tv
GROUP BY tv.parent_track_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;

-- 4. Check for versions with variant_index = 0 (should be NONE after migration)
SELECT
  tv.id,
  tv.parent_track_id,
  tv.variant_index,
  tv.suno_id,
  t.title,
  t.suno_id as main_track_suno_id
FROM track_versions tv
JOIN tracks t ON t.id = tv.parent_track_id
WHERE tv.variant_index = 0
ORDER BY tv.created_at DESC
LIMIT 20;

-- 5. Check for duplicate suno_ids between tracks and track_versions
SELECT
  t.id as track_id,
  t.title,
  t.suno_id as track_suno_id,
  tv.id as version_id,
  tv.variant_index,
  tv.suno_id as version_suno_id
FROM tracks t
JOIN track_versions tv ON tv.parent_track_id = t.id
WHERE t.suno_id IS NOT NULL
  AND tv.suno_id IS NOT NULL
  AND t.suno_id = tv.suno_id
ORDER BY t.created_at DESC
LIMIT 20;
