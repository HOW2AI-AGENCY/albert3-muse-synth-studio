-- ============================================================================
-- SUNO PERSONAS TABLE
-- ============================================================================
-- Таблица для хранения персон (музыкальных персонажей) созданных из треков
-- Используется для генерации музыки с похожим стилем

CREATE TABLE IF NOT EXISTS public.suno_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Suno API данные
  suno_persona_id TEXT NOT NULL UNIQUE,
  
  -- Исходный трек
  source_track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
  source_suno_task_id TEXT,
  source_music_index INTEGER DEFAULT 0,
  
  -- Данные персоны
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image_url TEXT,
  
  -- Настройки
  is_public BOOLEAN DEFAULT false,
  
  -- Метрики использования
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT suno_personas_name_check CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  CONSTRAINT suno_personas_description_check CHECK (char_length(description) >= 1 AND char_length(description) <= 500)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_suno_personas_user_id ON public.suno_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_suno_personas_suno_persona_id ON public.suno_personas(suno_persona_id);
CREATE INDEX IF NOT EXISTS idx_suno_personas_source_track_id ON public.suno_personas(source_track_id);
CREATE INDEX IF NOT EXISTS idx_suno_personas_is_public ON public.suno_personas(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_suno_personas_created_at ON public.suno_personas(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.suno_personas ENABLE ROW LEVEL SECURITY;

-- Пользователи видят свои персоны
CREATE POLICY "Users can view own personas"
  ON public.suno_personas FOR SELECT
  USING (auth.uid() = user_id);

-- Публичные персоны видны всем
CREATE POLICY "Public personas viewable by everyone"
  ON public.suno_personas FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Пользователи создают свои персоны
CREATE POLICY "Users can create own personas"
  ON public.suno_personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователи обновляют свои персоны
CREATE POLICY "Users can update own personas"
  ON public.suno_personas FOR UPDATE
  USING (auth.uid() = user_id);

-- Пользователи удаляют свои персоны
CREATE POLICY "Users can delete own personas"
  ON public.suno_personas FOR DELETE
  USING (auth.uid() = user_id);

-- Админы видят все персоны
CREATE POLICY "Admins can view all personas"
  ON public.suno_personas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Обновление updated_at при изменении
CREATE OR REPLACE FUNCTION public.update_suno_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_suno_personas_updated_at
  BEFORE UPDATE ON public.suno_personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_suno_personas_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.suno_personas IS 'Suno AI персоны (музыкальные персонажи) для генерации музыки с похожим стилем';
COMMENT ON COLUMN public.suno_personas.suno_persona_id IS 'ID персоны в Suno API';
COMMENT ON COLUMN public.suno_personas.source_track_id IS 'Исходный трек из которого создана персона';
COMMENT ON COLUMN public.suno_personas.source_music_index IS 'Индекс варианта музыки (0 или 1)';
COMMENT ON COLUMN public.suno_personas.name IS 'Название персоны (1-100 символов)';
COMMENT ON COLUMN public.suno_personas.description IS 'Описание музыкального стиля персоны (1-500 символов)';
COMMENT ON COLUMN public.suno_personas.is_public IS 'Публичная ли персона (доступна другим пользователям)';
COMMENT ON COLUMN public.suno_personas.usage_count IS 'Количество использований персоны в генерациях';