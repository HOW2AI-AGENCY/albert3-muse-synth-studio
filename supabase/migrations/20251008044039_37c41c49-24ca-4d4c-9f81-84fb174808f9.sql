-- Добавить колонку для трекинга прослушиваний
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;

-- Добавить индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON public.tracks(play_count DESC);