-- Update track_versions URLs to include .mp3 extension if missing
UPDATE track_versions
SET audio_url = audio_url || '.mp3'
WHERE audio_url NOT LIKE '%.mp3'
  AND audio_url NOT LIKE '%?%'
  AND audio_url LIKE 'https://mfile.erweima.ai/%';