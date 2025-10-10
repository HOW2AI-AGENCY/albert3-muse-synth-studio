-- Создание таблицы для системы уведомлений
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('track', 'like', 'comment', 'system', 'generation', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы для производительности
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;

-- Включение RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Триггер для updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Функция для создания уведомления о готовом треке
CREATE OR REPLACE FUNCTION public.notify_track_ready()
RETURNS TRIGGER
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

-- Триггер для автоматического создания уведомлений о треках
CREATE TRIGGER track_status_notification
  AFTER UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_track_ready();

-- Функция для создания уведомления о лайке
CREATE OR REPLACE FUNCTION public.notify_track_like()
RETURNS TRIGGER
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

-- Триггер для уведомлений о лайках
CREATE TRIGGER track_like_notification
  AFTER INSERT ON public.track_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_track_like();