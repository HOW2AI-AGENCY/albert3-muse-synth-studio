-- Create storage bucket for reference audio uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('reference-audio', 'reference-audio', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for reference-audio bucket
CREATE POLICY "Users can upload their own reference audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reference-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own reference audio"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reference-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own reference audio"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'reference-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);