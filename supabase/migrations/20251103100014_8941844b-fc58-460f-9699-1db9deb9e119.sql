-- ============================================================
-- ЗАЩИТА СИСТЕМЫ ВЕРСИОНИРОВАНИЯ ТРЕКОВ
-- Добавление RLS политик для track_versions таблицы
-- ============================================================

-- 1. Включить RLS для track_versions (если еще не включен)
ALTER TABLE public.track_versions ENABLE ROW LEVEL SECURITY;

-- 2. Политика SELECT: Пользователи могут видеть версии своих треков
DROP POLICY IF EXISTS "Users can view their own track versions" ON public.track_versions;
CREATE POLICY "Users can view their own track versions"
ON public.track_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tracks
    WHERE tracks.id = track_versions.parent_track_id
    AND tracks.user_id = auth.uid()
  )
);

-- 3. Политика SELECT: Админы могут видеть все версии
DROP POLICY IF EXISTS "Admins can view all track versions" ON public.track_versions;
CREATE POLICY "Admins can view all track versions"
ON public.track_versions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 4. Политика INSERT: Только system может создавать версии (Edge Functions)
DROP POLICY IF EXISTS "Only system can insert track versions" ON public.track_versions;
CREATE POLICY "Only system can insert track versions"
ON public.track_versions
FOR INSERT
WITH CHECK (
  -- Разрешить только сервисной роли (Edge Functions)
  auth.jwt()->>'role' = 'service_role'
  OR
  -- Или владельцу трека
  EXISTS (
    SELECT 1 FROM public.tracks
    WHERE tracks.id = track_versions.parent_track_id
    AND tracks.user_id = auth.uid()
  )
);

-- 5. Политика UPDATE: Пользователи могут обновлять только is_preferred_variant
DROP POLICY IF EXISTS "Users can update preferred variant flag" ON public.track_versions;
CREATE POLICY "Users can update preferred variant flag"
ON public.track_versions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tracks
    WHERE tracks.id = track_versions.parent_track_id
    AND tracks.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Разрешить изменять только is_preferred_variant и is_primary_variant
  -- Все остальные поля должны оставаться неизменными
  parent_track_id = (SELECT parent_track_id FROM public.track_versions WHERE id = track_versions.id)
  AND variant_index = (SELECT variant_index FROM public.track_versions WHERE id = track_versions.id)
  AND audio_url = (SELECT audio_url FROM public.track_versions WHERE id = track_versions.id)
);

-- 6. Политика UPDATE: Админы могут обновлять все
DROP POLICY IF EXISTS "Admins can update all track versions" ON public.track_versions;
CREATE POLICY "Admins can update all track versions"
ON public.track_versions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- 7. Политика DELETE: Пользователи НЕ МОГУТ удалять версии (только админы)
DROP POLICY IF EXISTS "Only admins can delete track versions" ON public.track_versions;
CREATE POLICY "Only admins can delete track versions"
ON public.track_versions
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- 8. Создать функцию валидации для защиты критичных полей
CREATE OR REPLACE FUNCTION public.validate_track_version_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Защита от изменения parent_track_id
  IF OLD.parent_track_id IS DISTINCT FROM NEW.parent_track_id THEN
    RAISE EXCEPTION 'Cannot change parent_track_id of a track version';
  END IF;

  -- Защита от изменения variant_index (критично для логики!)
  IF OLD.variant_index IS DISTINCT FROM NEW.variant_index THEN
    RAISE EXCEPTION 'Cannot change variant_index of a track version';
  END IF;

  -- Защита от изменения audio_url (если не админ)
  IF OLD.audio_url IS DISTINCT FROM NEW.audio_url AND 
     NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Cannot change audio_url of a track version (admin only)';
  END IF;

  RETURN NEW;
END;
$$;

-- 9. Создать триггер для валидации обновлений
DROP TRIGGER IF EXISTS validate_track_version_update_trigger ON public.track_versions;
CREATE TRIGGER validate_track_version_update_trigger
BEFORE UPDATE ON public.track_versions
FOR EACH ROW
EXECUTE FUNCTION public.validate_track_version_update();

-- 10. Добавить constraint для защиты variant_index
ALTER TABLE public.track_versions
DROP CONSTRAINT IF EXISTS track_versions_variant_index_non_negative;

ALTER TABLE public.track_versions
ADD CONSTRAINT track_versions_variant_index_non_negative
CHECK (variant_index IS NULL OR variant_index >= 0);

-- 11. Создать индекс для оптимизации RLS запросов
CREATE INDEX IF NOT EXISTS idx_track_versions_parent_track_id
ON public.track_versions(parent_track_id);

CREATE INDEX IF NOT EXISTS idx_track_versions_variant_index
ON public.track_versions(parent_track_id, variant_index);

-- 12. Логирование для аудита изменений
COMMENT ON TABLE public.track_versions IS 'PROTECTED: Track versions table. Changes require Team Lead approval. See docs/PROTECTED_FILES.md';
COMMENT ON COLUMN public.track_versions.variant_index IS 'CRITICAL: Do not modify! Used for version numbering logic (0 = main, 1+ = variants)';
COMMENT ON COLUMN public.track_versions.parent_track_id IS 'CRITICAL: Do not modify after creation!';
COMMENT ON FUNCTION public.validate_track_version_update() IS 'PROTECTED: Validates track version updates to prevent destructive changes';