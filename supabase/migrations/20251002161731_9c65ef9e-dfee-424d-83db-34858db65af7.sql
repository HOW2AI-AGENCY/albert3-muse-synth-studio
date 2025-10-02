-- Create RPC function to safely increment view count
CREATE OR REPLACE FUNCTION increment_view_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tracks 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = track_id;
END;
$$;