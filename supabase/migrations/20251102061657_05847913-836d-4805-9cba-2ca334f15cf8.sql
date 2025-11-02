-- ============================================
-- CRITICAL FIX: Duration Field Type Mismatch
-- ============================================
-- 
-- ПРОБЛЕМА: Suno API возвращает duration как decimal (179.96), но в БД поле INTEGER
-- ОШИБКА: "invalid input syntax for type integer: '179.96'"
-- 
-- РЕШЕНИЕ: Изменить тип duration на NUMERIC для хранения точных значений

-- ============================================
-- 1. ИЗМЕНЕНИЕ ТИПА DURATION НА NUMERIC В TRACKS
-- ============================================

-- Изменить duration на NUMERIC(10,2) для точного хранения секунд с десятыми
ALTER TABLE tracks 
ALTER COLUMN duration TYPE NUMERIC(10,2) USING duration::NUMERIC(10,2);

-- Изменить duration_seconds на NUMERIC(10,2) для согласованности
ALTER TABLE tracks 
ALTER COLUMN duration_seconds TYPE NUMERIC(10,2) USING duration_seconds::NUMERIC(10,2);

-- ============================================
-- 2. ОБНОВЛЕНИЕ TRACK_VERSIONS
-- ============================================

ALTER TABLE track_versions 
ALTER COLUMN duration TYPE NUMERIC(10,2) USING duration::NUMERIC(10,2);

-- ============================================
-- 3. КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON COLUMN tracks.duration IS 
'Track duration in seconds (NUMERIC(10,2)). Supports decimal values from providers like Suno (e.g., 179.96). Use duration_seconds for integer seconds.';

COMMENT ON COLUMN tracks.duration_seconds IS 
'Duplicate of duration for backward compatibility. Both support decimal values. Use ROUND(duration) for integer seconds.';

COMMENT ON COLUMN track_versions.duration IS 
'Track version duration in seconds (NUMERIC(10,2)). Supports decimal values.';