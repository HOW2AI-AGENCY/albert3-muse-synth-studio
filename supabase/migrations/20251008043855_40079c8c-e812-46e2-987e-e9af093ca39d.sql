-- Добавить колонку для трекинга скачиваний
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- Создать функцию для инкремента счетчика скачиваний
CREATE OR REPLACE FUNCTION public.increment_download_count(track_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tracks 
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = track_id;
END;
$$;

-- Добавить индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_tracks_download_count ON public.tracks(download_count DESC);