-- Миграция: fix_track_versions_identification
-- Описание: Исправление идентификации версий треков и создание недостающих записей
-- Автор: AI Assistant
-- Дата: 2025-01-XX

-- 1. Создаем функцию для автоматического создания записей track_versions при расширении/кавере
CREATE OR REPLACE FUNCTION public.create_version_from_extended_track()
RETURNS TRIGGER AS $$
DECLARE
  parent_id UUID;
  next_version_num INTEGER;
BEGIN
  -- Проверяем, является ли трек расширением или кавером
  IF NEW.metadata IS NOT NULL AND 
     (NEW.metadata ? 'extended_from' OR NEW.metadata ? 'is_cover') AND
     NEW.status = 'completed' AND
     NEW.audio_url IS NOT NULL THEN
    
    -- Получаем parent_track_id
    parent_id := COALESCE(
      (NEW.metadata->>'extended_from')::UUID,
      (NEW.metadata->>'reference_track_id')::UUID
    );
    
    IF parent_id IS NOT NULL THEN
      -- Получаем номер следующей версии
      SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version_num
      FROM track_versions
      WHERE parent_track_id = parent_id;
      
      -- Создаем запись в track_versions (если её ещё нет)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Создаем триггер для автоматического создания версий
DROP TRIGGER IF EXISTS auto_create_track_version ON tracks;
CREATE TRIGGER auto_create_track_version
  AFTER UPDATE OF status ON tracks
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION create_version_from_extended_track();

-- 3. Исправляем существующие треки "Сияние Внутри"
-- Находим родительский трек
DO $$
DECLARE
  parent_id UUID;
  extended_track_id UUID;
BEGIN
  -- Ищем оригинальный трек "Сияние Внутри"
  SELECT id INTO parent_id
  FROM tracks
  WHERE title = 'Сияние Внутри'
    AND metadata IS NULL OR NOT (metadata ? 'extended_from')
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF parent_id IS NOT NULL THEN
    -- Ищем extended версию
    SELECT id INTO extended_track_id
    FROM tracks
    WHERE title LIKE 'Сияние Внутри%'
      AND (metadata->>'extended_from')::UUID = parent_id
    LIMIT 1;
    
    IF extended_track_id IS NOT NULL THEN
      -- Создаем запись в track_versions для extended версии (если её нет)
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
      SELECT
        parent_id,
        1, -- Первая дополнительная версия
        false,
        t.audio_url,
        t.cover_url,
        t.video_url,
        COALESCE(t.duration, t.duration_seconds),
        t.lyrics,
        t.suno_id,
        jsonb_build_object(
          'source', 'extend',
          'original_track_id', t.id,
          'fixed_by_migration', true
        )
      FROM tracks t
      WHERE t.id = extended_track_id
      ON CONFLICT (parent_track_id, version_number) DO UPDATE
      SET
        audio_url = EXCLUDED.audio_url,
        metadata = EXCLUDED.metadata;
      
    END IF;
  END IF;
END $$;