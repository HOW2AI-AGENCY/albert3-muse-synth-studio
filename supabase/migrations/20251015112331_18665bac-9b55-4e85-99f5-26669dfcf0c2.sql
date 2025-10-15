-- ============================================================================
-- МИГРАЦИЯ: Восстановление функционала аналитики и лайков
-- Дата: 2025-10-15
-- Описание: Исправление критических проблем с счетчиками и триггерами
-- ============================================================================

-- 1. ✅ ТРИГГЕР: Автоматическое обновление счетчика лайков при добавлении/удалении
DROP TRIGGER IF EXISTS update_track_likes_count_trigger ON public.track_likes;

CREATE TRIGGER update_track_likes_count_trigger
  AFTER INSERT OR DELETE ON public.track_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_track_likes_count();

-- 2. ✅ ФУНКЦИИ: Убедимся что функции increment существуют и работают корректно
-- Проверяем функцию increment_view_count
DROP FUNCTION IF EXISTS public.increment_view_count(uuid);

CREATE OR REPLACE FUNCTION public.increment_view_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tracks 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = track_id;
END;
$$;

-- Проверяем функцию increment_play_count  
DROP FUNCTION IF EXISTS public.increment_play_count(uuid);

CREATE OR REPLACE FUNCTION public.increment_play_count(track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tracks 
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = track_id;
END;
$$;

-- 3. ✅ ИНДЕКСЫ: Оптимизация для аналитики
CREATE INDEX IF NOT EXISTS idx_tracks_user_play_count 
  ON public.tracks(user_id, play_count DESC);

CREATE INDEX IF NOT EXISTS idx_tracks_user_like_count 
  ON public.tracks(user_id, like_count DESC);

CREATE INDEX IF NOT EXISTS idx_tracks_user_view_count 
  ON public.tracks(user_id, view_count DESC);

CREATE INDEX IF NOT EXISTS idx_track_likes_track_user 
  ON public.track_likes(track_id, user_id);

-- 4. ✅ GRANT permissions для анонимных пользователей на RPC функции
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_play_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_download_count(uuid) TO anon, authenticated;

-- 5. ✅ Убедимся что счетчики инициализированы корректно
UPDATE public.tracks 
SET 
  view_count = COALESCE(view_count, 0),
  play_count = COALESCE(play_count, 0),
  like_count = COALESCE(like_count, 0),
  download_count = COALESCE(download_count, 0)
WHERE 
  view_count IS NULL 
  OR play_count IS NULL 
  OR like_count IS NULL 
  OR download_count IS NULL;