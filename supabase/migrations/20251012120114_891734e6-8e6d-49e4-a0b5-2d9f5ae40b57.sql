-- Fix function search paths for security
-- All SECURITY DEFINER functions must have a fixed search_path

-- Fix has_role function (both overloaded versions)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;

-- Fix increment_download_count function
CREATE OR REPLACE FUNCTION public.increment_download_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE tracks 
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = track_id;
END;
$$;

-- Fix notify_track_like function
CREATE OR REPLACE FUNCTION public.notify_track_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  track_owner UUID;
  track_title TEXT;
BEGIN
  SELECT user_id, title INTO track_owner, track_title
  FROM public.tracks
  WHERE id = NEW.track_id;
  
  IF track_owner != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      track_owner,
      'like',
      'Новый лайк',
      'Пользователь отметил ваш трек "' || track_title || '"',
      '/workspace/library?track=' || NEW.track_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix create_version_from_extended_track function
CREATE OR REPLACE FUNCTION public.create_version_from_extended_track()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  parent_id UUID;
  next_version_num INTEGER;
BEGIN
  IF NEW.metadata IS NOT NULL AND 
     (NEW.metadata ? 'extended_from' OR NEW.metadata ? 'is_cover') AND
     NEW.status = 'completed' AND
     NEW.audio_url IS NOT NULL THEN
    
    parent_id := COALESCE(
      (NEW.metadata->>'extended_from')::UUID,
      (NEW.metadata->>'reference_track_id')::UUID
    );
    
    IF parent_id IS NOT NULL THEN
      SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version_num
      FROM track_versions
      WHERE parent_track_id = parent_id;
      
      INSERT INTO track_versions (
        parent_track_id,
        version_number,
        is_master,
        audio_url,
        cover_url,
        video_url,
        duration,
        lyrics,
        suno_id,
        metadata
      )
      VALUES (
        parent_id,
        next_version_num,
        false,
        NEW.audio_url,
        NEW.cover_url,
        NEW.video_url,
        COALESCE(NEW.duration, NEW.duration_seconds),
        NEW.lyrics,
        NEW.suno_id,
        jsonb_build_object(
          'source', CASE 
            WHEN NEW.metadata ? 'extended_from' THEN 'extend'
            WHEN NEW.metadata ? 'is_cover' THEN 'cover'
            ELSE 'unknown'
          END,
          'original_track_id', NEW.id,
          'created_from_trigger', true
        )
      )
      ON CONFLICT (parent_track_id, version_number) DO NOTHING;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix increment_play_count function
CREATE OR REPLACE FUNCTION public.increment_play_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE tracks 
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = track_id;
END;
$$;

-- Fix notify_track_ready function
CREATE OR REPLACE FUNCTION public.notify_track_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Fix notify_track_liked function
CREATE OR REPLACE FUNCTION public.notify_track_liked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Fix update_track_likes_count function
CREATE OR REPLACE FUNCTION public.update_track_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tracks 
    SET like_count = like_count + 1 
    WHERE id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tracks 
    SET like_count = like_count - 1 
    WHERE id = OLD.track_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix increment_view_count function
CREATE OR REPLACE FUNCTION public.increment_view_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE tracks 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = track_id;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;