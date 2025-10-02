-- Fix RLS policy on profiles table to prevent email exposure
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Allow users to view only their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow public access to non-sensitive profile fields only
CREATE POLICY "Public profiles viewable"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- However, we need to restrict email exposure at the column level
-- So let's revoke the public policy and keep only own-profile access
DROP POLICY IF EXISTS "Public profiles viewable" ON public.profiles;

-- Restrict track_likes to only show likes for public tracks or user's own activity
DROP POLICY IF EXISTS "Users can view all likes" ON public.track_likes;

CREATE POLICY "Users can view public track likes"
ON public.track_likes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.tracks 
    WHERE tracks.id = track_likes.track_id 
    AND tracks.is_public = true
  )
);