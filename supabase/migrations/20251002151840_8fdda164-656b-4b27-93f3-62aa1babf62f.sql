-- Backfill track_versions for existing tracks that don't have versions yet
-- This migration creates version 1 for each track that exists but has no versions

INSERT INTO track_versions (
  parent_track_id,
  version_number,
  is_master,
  audio_url,
  video_url,
  cover_url,
  lyrics,
  duration,
  suno_id,
  metadata
)
SELECT 
  t.id as parent_track_id,
  1 as version_number,
  true as is_master,
  t.audio_url,
  t.video_url,
  t.cover_url,
  t.lyrics,
  t.duration,
  t.suno_id,
  t.metadata
FROM tracks t
LEFT JOIN track_versions tv ON tv.parent_track_id = t.id
WHERE tv.id IS NULL 
  AND t.status = 'completed' 
  AND t.audio_url IS NOT NULL;
