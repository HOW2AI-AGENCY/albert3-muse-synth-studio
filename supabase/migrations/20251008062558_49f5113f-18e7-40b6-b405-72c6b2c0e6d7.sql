-- Fix user_roles RLS policies to avoid recursion
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create non-recursive RLS policies using the has_role function
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Add foreign key from tracks.user_id to profiles(id)
ALTER TABLE public.tracks
DROP CONSTRAINT IF EXISTS tracks_user_id_fkey;

ALTER TABLE public.tracks
ADD CONSTRAINT tracks_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;