-- ✅ Миграция: Добавить индексы для track_versions
-- Описание: Оптимизация запросов к таблице track_versions
-- Дата: 2025-10-12

-- ✅ Индекс для быстрого поиска версий трека
CREATE INDEX IF NOT EXISTS idx_track_versions_parent_id 
ON track_versions(parent_track_id);

-- ✅ Индекс для сортировки версий
CREATE INDEX IF NOT EXISTS idx_track_versions_parent_version 
ON track_versions(parent_track_id, version_number);

-- ✅ Индекс для поиска мастер-версии
CREATE INDEX IF NOT EXISTS idx_track_versions_master 
ON track_versions(parent_track_id, is_master) 
WHERE is_master = true;

-- ✅ Проверка производительности
ANALYZE track_versions;