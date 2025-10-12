-- Migration: create_wav_jobs_table
-- Создание таблицы для отслеживания задач конвертации в WAV

CREATE TABLE IF NOT EXISTS public.wav_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  suno_task_id TEXT,
  audio_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  wav_url TEXT,
  callback_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Индексы для производительности
CREATE INDEX idx_wav_jobs_user_id ON public.wav_jobs(user_id);
CREATE INDEX idx_wav_jobs_track_id ON public.wav_jobs(track_id);
CREATE INDEX idx_wav_jobs_suno_task_id ON public.wav_jobs(suno_task_id);
CREATE INDEX idx_wav_jobs_status ON public.wav_jobs(status);

-- Триггер для обновления updated_at
CREATE TRIGGER set_wav_jobs_updated_at
  BEFORE UPDATE ON public.wav_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE public.wav_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own jobs
CREATE POLICY "Users can view own wav jobs"
  ON public.wav_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert own jobs
CREATE POLICY "Users can insert own wav jobs"
  ON public.wav_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can update all jobs (для callback)
CREATE POLICY "Service role can update wav jobs"
  ON public.wav_jobs
  FOR UPDATE
  USING (true);

-- Policy: Admins can view all jobs
CREATE POLICY "Admins can view all wav jobs"
  ON public.wav_jobs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Комментарии для документации
COMMENT ON TABLE public.wav_jobs IS 'Tracks WAV format conversion tasks via Suno API';
COMMENT ON COLUMN public.wav_jobs.suno_task_id IS 'Task ID from Suno API /api/v1/wav/generate';
COMMENT ON COLUMN public.wav_jobs.audio_id IS 'Specific audio ID to convert (from Suno generation)';
COMMENT ON COLUMN public.wav_jobs.wav_url IS 'Download URL for converted WAV file';