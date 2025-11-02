-- Оптимизация базы данных: добавление индексов для повышения производительности

-- Индексы для tracks (наиболее часто запрашиваемая таблица)
CREATE INDEX IF NOT EXISTS idx_tracks_user_status ON public.tracks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tracks_created_desc ON public.tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_provider_status ON public.tracks(provider, status);
CREATE INDEX IF NOT EXISTS idx_tracks_project_id ON public.tracks(project_id) WHERE project_id IS NOT NULL;

-- Индексы для lyrics_jobs
CREATE INDEX IF NOT EXISTS idx_lyrics_jobs_user_status ON public.lyrics_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lyrics_jobs_track_id ON public.lyrics_jobs(track_id) WHERE track_id IS NOT NULL;

-- Индексы для track_likes (для быстрого поиска лайков)
CREATE INDEX IF NOT EXISTS idx_track_likes_track_user ON public.track_likes(track_id, user_id);

-- Индексы для notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- Композитный индекс для фильтрации треков по провайдеру и статусу
CREATE INDEX IF NOT EXISTS idx_tracks_user_provider_status 
  ON public.tracks(user_id, provider, status, created_at DESC);

-- Удаляем дубликаты индексов
DROP INDEX IF EXISTS public.idx_tracks_user_id;
DROP INDEX IF EXISTS public.idx_tracks_created_at;
DROP INDEX IF EXISTS public.idx_tracks_status;