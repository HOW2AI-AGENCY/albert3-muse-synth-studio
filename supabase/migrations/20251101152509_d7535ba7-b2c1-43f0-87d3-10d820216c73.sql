-- Fix #1: Add RLS policies to track_section_replacements table
-- Users can view their own replacements
CREATE POLICY "users_view_own_replacements"
ON public.track_section_replacements FOR SELECT
USING (
  parent_track_id IN (
    SELECT id FROM public.tracks WHERE user_id = auth.uid()
  )
);

-- Users can create replacements for their tracks
CREATE POLICY "users_create_own_replacements"
ON public.track_section_replacements FOR INSERT
WITH CHECK (
  parent_track_id IN (
    SELECT id FROM public.tracks WHERE user_id = auth.uid()
  )
);

-- Users can update their own replacements (for status updates from callbacks)
CREATE POLICY "users_update_own_replacements"
ON public.track_section_replacements FOR UPDATE
USING (
  parent_track_id IN (
    SELECT id FROM public.tracks WHERE user_id = auth.uid()
  )
);

-- System can update replacements (for callbacks)
CREATE POLICY "system_update_replacements"
ON public.track_section_replacements FOR UPDATE
USING (true);

-- Admins can view all replacements
CREATE POLICY "admins_view_all_replacements"
ON public.track_section_replacements FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Fix #2: Fix security definer view - change to SECURITY INVOKER
DROP VIEW IF EXISTS public.tracks_with_timestamped_lyrics;

CREATE VIEW public.tracks_with_timestamped_lyrics 
WITH (security_invoker=true)
AS
SELECT 
  id,
  title,
  audio_url,
  lyrics,
  metadata->'timestamped_lyrics' as timestamped_lyrics,
  (metadata->'timestamped_lyrics' IS NOT NULL) as has_timestamped_lyrics
FROM public.tracks
WHERE audio_url IS NOT NULL AND lyrics IS NOT NULL;