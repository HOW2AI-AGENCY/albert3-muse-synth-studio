-- Добавляем новые поля в таблицу tracks для расширенного функционала
ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'replicate',
ADD COLUMN IF NOT EXISTS lyrics TEXT,
ADD COLUMN IF NOT EXISTS style_tags TEXT[],
ADD COLUMN IF NOT EXISTS has_vocals BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reference_audio_url TEXT;

-- Индекс для быстрого поиска по провайдеру
CREATE INDEX IF NOT EXISTS idx_tracks_provider ON tracks(provider);

-- Индекс для поиска по тегам стиля
CREATE INDEX IF NOT EXISTS idx_tracks_style_tags ON tracks USING GIN(style_tags);