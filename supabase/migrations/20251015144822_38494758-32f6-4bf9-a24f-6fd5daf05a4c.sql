-- Migration: Исправление security warning с CASCADE
-- Дата: 2025-10-15

-- Удалить триггер и функцию с CASCADE
DROP TRIGGER IF EXISTS trigger_set_primary_variant ON public.track_versions;
DROP FUNCTION IF EXISTS set_primary_variant_on_first_insert() CASCADE;

-- Пересоздать функцию с правильным SET search_path
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Пересоздать триггер
CREATE TRIGGER trigger_set_primary_variant
  BEFORE INSERT ON public.track_versions
  FOR EACH ROW
  EXECUTE FUNCTION set_primary_variant_on_first_insert();