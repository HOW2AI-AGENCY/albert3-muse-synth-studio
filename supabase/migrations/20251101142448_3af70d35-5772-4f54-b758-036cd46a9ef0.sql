-- Create storage bucket for user audio uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-audio-uploads', 'user-audio-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for user-audio-uploads bucket
CREATE POLICY "Users can upload own audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-audio-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own audio files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-audio-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own audio files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-audio-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);