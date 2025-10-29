-- SPRINT 31: Система логирования сгенерированных текстов песен
-- Создаем таблицу для хранения всех запросов на генерацию текстов

CREATE TABLE IF NOT EXISTS public.lyrics_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_lyrics TEXT,
  generated_title TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_lyrics_generation_log_user_id ON public.lyrics_generation_log(user_id);
CREATE INDEX idx_lyrics_generation_log_status ON public.lyrics_generation_log(status);
CREATE INDEX idx_lyrics_generation_log_created_at ON public.lyrics_generation_log(created_at DESC);

-- RLS Policies
ALTER TABLE public.lyrics_generation_log ENABLE ROW LEVEL SECURITY;

-- Пользователи видят только свои логи
CREATE POLICY "Users can view their own lyrics generation logs"
  ON public.lyrics_generation_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Админы видят все
CREATE POLICY "Admins can view all lyrics generation logs"
  ON public.lyrics_generation_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Пользователи могут создавать свои логи (обычно через Edge Function)
CREATE POLICY "Users can insert their own lyrics generation logs"
  ON public.lyrics_generation_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger для автообновления updated_at
CREATE TRIGGER update_lyrics_generation_log_updated_at
  BEFORE UPDATE ON public.lyrics_generation_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();