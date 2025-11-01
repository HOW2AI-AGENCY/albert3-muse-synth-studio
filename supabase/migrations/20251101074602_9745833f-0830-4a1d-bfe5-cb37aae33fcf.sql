-- Добавляем функцию для синхронизации ai_description в tracks.metadata
CREATE OR REPLACE FUNCTION public.sync_ai_description_to_track()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Обновляем tracks.metadata с ai_description когда song_description завершён
  IF NEW.status = 'completed' AND NEW.ai_description IS NOT NULL AND NEW.track_id IS NOT NULL THEN
    UPDATE public.tracks
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'ai_description', NEW.ai_description,
      'detected_genre', NEW.detected_genre,
      'detected_mood', NEW.detected_mood,
      'tempo_bpm', NEW.tempo_bpm,
      'key_signature', NEW.key_signature,
      'detected_instruments', NEW.detected_instruments,
      'energy_level', NEW.energy_level,
      'danceability', NEW.danceability,
      'valence', NEW.valence,
      'description_updated_at', now()
    )
    WHERE id = NEW.track_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Создаём триггер для автоматической синхронизации
DROP TRIGGER IF EXISTS sync_ai_description_trigger ON public.song_descriptions;
CREATE TRIGGER sync_ai_description_trigger
  AFTER INSERT OR UPDATE ON public.song_descriptions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND NEW.ai_description IS NOT NULL)
  EXECUTE FUNCTION public.sync_ai_description_to_track();

-- Добавляем индекс на mureka_task_id для оптимизации queries
CREATE INDEX IF NOT EXISTS idx_tracks_mureka_task_id 
  ON public.tracks(mureka_task_id) 
  WHERE mureka_task_id IS NOT NULL;

-- Добавляем индекс на provider и status для часто используемых фильтров
CREATE INDEX IF NOT EXISTS idx_tracks_provider_status 
  ON public.tracks(provider, status);

-- Добавляем индекс на song_descriptions.track_id
CREATE INDEX IF NOT EXISTS idx_song_descriptions_track_id 
  ON public.song_descriptions(track_id) 
  WHERE track_id IS NOT NULL;

-- Мигрируем существующие данные из song_descriptions в tracks.metadata
UPDATE public.tracks t
SET metadata = COALESCE(t.metadata, '{}'::jsonb) || jsonb_build_object(
  'ai_description', sd.ai_description,
  'detected_genre', sd.detected_genre,
  'detected_mood', sd.detected_mood,
  'tempo_bpm', sd.tempo_bpm,
  'key_signature', sd.key_signature,
  'detected_instruments', sd.detected_instruments,
  'energy_level', sd.energy_level,
  'danceability', sd.danceability,
  'valence', sd.valence,
  'description_migrated_at', now()
)
FROM public.song_descriptions sd
WHERE sd.track_id = t.id
  AND sd.status = 'completed'
  AND sd.ai_description IS NOT NULL
  AND (t.metadata IS NULL OR NOT t.metadata ? 'ai_description');