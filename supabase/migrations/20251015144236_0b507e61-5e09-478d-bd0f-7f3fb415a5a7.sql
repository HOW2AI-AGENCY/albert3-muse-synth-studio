-- Migration: Унификация терминологии версионирования
-- Описание: Переименование полей для улучшения семантики и консистентности
-- Автор: System
-- Дата: 2025-10-15

-- Шаг 1: Переименовать колонки в track_versions
ALTER TABLE public.track_versions 
  RENAME COLUMN version_number TO variant_index;

ALTER TABLE public.track_versions 
  RENAME COLUMN is_master TO is_preferred_variant;

-- Шаг 2: Добавить новую колонку is_primary_variant (для оригинала)
ALTER TABLE public.track_versions 
  ADD COLUMN is_primary_variant BOOLEAN DEFAULT false;

-- Шаг 3: Создать индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_track_versions_variant_index 
  ON public.track_versions(variant_index);

CREATE INDEX IF NOT EXISTS idx_track_versions_preferred 
  ON public.track_versions(parent_track_id, is_preferred_variant) 
  WHERE is_preferred_variant = true;

CREATE INDEX IF NOT EXISTS idx_track_versions_primary 
  ON public.track_versions(parent_track_id, is_primary_variant) 
  WHERE is_primary_variant = true;

-- Шаг 4: Добавить комментарии для документации
COMMENT ON COLUMN public.track_versions.variant_index IS 
  'Порядковый номер варианта (0 для первичного, 1+ для альтернатив)';

COMMENT ON COLUMN public.track_versions.is_preferred_variant IS 
  'Флаг предпочтительного (мастер) варианта для воспроизведения';

COMMENT ON COLUMN public.track_versions.is_primary_variant IS 
  'Флаг первичного (оригинального) варианта трека';

-- Шаг 5: Создать функцию для автоматической установки is_primary_variant
CREATE OR REPLACE FUNCTION set_primary_variant_on_first_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Если это первая версия для трека, сделать её primary
  IF NOT EXISTS (
    SELECT 1 FROM public.track_versions 
    WHERE parent_track_id = NEW.parent_track_id
  ) THEN
    NEW.is_primary_variant := true;
    NEW.is_preferred_variant := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Шаг 6: Создать триггер для автоматической установки primary
DROP TRIGGER IF EXISTS trigger_set_primary_variant ON public.track_versions;

CREATE TRIGGER trigger_set_primary_variant
  BEFORE INSERT ON public.track_versions
  FOR EACH ROW
  EXECUTE FUNCTION set_primary_variant_on_first_insert();