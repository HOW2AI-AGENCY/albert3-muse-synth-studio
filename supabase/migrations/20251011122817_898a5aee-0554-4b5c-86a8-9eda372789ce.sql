-- Migration: Fix function search_path for security
-- Description: Add SET search_path = 'public' to all SECURITY DEFINER functions
-- Addresses: Supabase Linter Warning - Function Search Path Mutable

-- Fix increment_download_count
CREATE OR REPLACE FUNCTION public.increment_download_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE tracks 
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = track_id;
END;
$function$;

-- Fix increment_play_count
CREATE OR REPLACE FUNCTION public.increment_play_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE tracks 
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = track_id;
END;
$function$;

-- Fix increment_view_count
CREATE OR REPLACE FUNCTION public.increment_view_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE tracks 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = track_id;
END;
$function$;

-- Fix notify_track_ready
CREATE OR REPLACE FUNCTION public.notify_track_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'track',
      'Трек готов',
      'Ваш трек "' || NEW.title || '" успешно сгенерирован',
      '/workspace/library?track=' || NEW.id
    );
  ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'error',
      'Ошибка генерации',
      'Не удалось сгенерировать трек "' || NEW.title || '"',
      '/workspace/library'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix notify_track_liked
CREATE OR REPLACE FUNCTION public.notify_track_liked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  track_owner_id uuid;
  track_title text;
  liker_name text;
BEGIN
  SELECT user_id, title INTO track_owner_id, track_title
  FROM public.tracks
  WHERE id = NEW.track_id;

  SELECT full_name INTO liker_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF track_owner_id IS NOT NULL AND track_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      track_owner_id,
      'like',
      'Новый лайк',
      COALESCE(liker_name, 'Пользователь') || ' оценил ваш трек "' || track_title || '"',
      '/workspace/library?track=' || NEW.track_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix has_role function (if exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$function$;