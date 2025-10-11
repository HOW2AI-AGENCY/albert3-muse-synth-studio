-- Миграция для очистки данных и перенумерации версий треков
-- Автор: AI Assistant
-- Дата: 2025-10-11

-- 1. Удаляем суффиксы "(Vn)" из названий треков
UPDATE tracks
SET title = regexp_replace(title, '\s*\(V[0-9]+\)$', '', 'i')
WHERE title ~ '\(V[0-9]+\)$';

-- 2. Перенумеровываем версии по порядку создания для каждого parent_track_id
WITH ordered AS (
  SELECT 
    id, 
    parent_track_id,
    ROW_NUMBER() OVER (PARTITION BY parent_track_id ORDER BY created_at, id) AS rn
  FROM track_versions
)
UPDATE track_versions tv
SET version_number = ordered.rn
FROM ordered
WHERE tv.id = ordered.id
  AND tv.version_number IS DISTINCT FROM ordered.rn;