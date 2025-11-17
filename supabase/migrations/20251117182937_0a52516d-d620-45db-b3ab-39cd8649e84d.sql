-- Добавляем persona_id к tracks для привязки персон
ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS persona_id TEXT;

-- Создаем индекс для быстрого поиска треков по персоне
CREATE INDEX IF NOT EXISTS idx_tracks_persona_id 
ON tracks(persona_id);

-- Комментарий для документации
COMMENT ON COLUMN tracks.persona_id IS 'Reference to suno_personas.suno_persona_id for voice/style consistency';
