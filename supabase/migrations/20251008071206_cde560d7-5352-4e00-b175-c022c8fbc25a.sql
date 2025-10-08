-- Create Storage buckets for audio, covers, and videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('tracks-audio', 'tracks-audio', true, 104857600, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3']),
  ('tracks-covers', 'tracks-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('tracks-videos', 'tracks-videos', true, 524288000, ARRAY['video/mp4', 'video/webm']);

-- RLS policies for tracks-audio bucket
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tracks-audio');

CREATE POLICY "Anyone can view audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tracks-audio');

CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tracks-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for tracks-covers bucket
CREATE POLICY "Authenticated users can upload covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tracks-covers');

CREATE POLICY "Anyone can view covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tracks-covers');

CREATE POLICY "Users can delete own covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tracks-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for tracks-videos bucket
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tracks-videos');

CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tracks-videos');

CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tracks-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);