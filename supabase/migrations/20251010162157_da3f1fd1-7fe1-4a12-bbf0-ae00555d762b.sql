-- Create enum for lyrics job status if not exists
DO $$ BEGIN
  CREATE TYPE public.lyrics_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create lyrics_jobs table
CREATE TABLE IF NOT EXISTS public.lyrics_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  suno_task_id TEXT,
  call_strategy TEXT DEFAULT 'callback',
  callback_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  request_payload JSONB,
  initial_response JSONB,
  last_callback JSONB,
  last_poll_response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create lyrics_variants table
CREATE TABLE IF NOT EXISTS public.lyrics_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.lyrics_jobs(id) ON DELETE CASCADE,
  variant_index INTEGER NOT NULL,
  title TEXT,
  status TEXT,
  content TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, variant_index)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lyrics_jobs_user_id ON public.lyrics_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_jobs_status ON public.lyrics_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lyrics_jobs_suno_task_id ON public.lyrics_jobs(suno_task_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_jobs_track_id ON public.lyrics_jobs(track_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_variants_job_id ON public.lyrics_variants(job_id);

-- Enable RLS
ALTER TABLE public.lyrics_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyrics_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lyrics_jobs
CREATE POLICY "Users can view own lyrics jobs"
  ON public.lyrics_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lyrics jobs"
  ON public.lyrics_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lyrics jobs"
  ON public.lyrics_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert lyrics jobs"
  ON public.lyrics_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update lyrics jobs"
  ON public.lyrics_jobs FOR UPDATE
  USING (true);

-- RLS Policies for lyrics_variants
CREATE POLICY "Users can view variants of own jobs"
  ON public.lyrics_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lyrics_jobs
    WHERE lyrics_jobs.id = lyrics_variants.job_id
      AND lyrics_jobs.user_id = auth.uid()
  ));

CREATE POLICY "System can insert variants"
  ON public.lyrics_variants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update variants"
  ON public.lyrics_variants FOR UPDATE
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_lyrics_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lyrics_jobs_updated_at
  BEFORE UPDATE ON public.lyrics_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lyrics_jobs_updated_at();

CREATE TRIGGER update_lyrics_variants_updated_at
  BEFORE UPDATE ON public.lyrics_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lyrics_jobs_updated_at();