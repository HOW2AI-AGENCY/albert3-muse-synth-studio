ALTER TABLE public.lyrics_jobs
  ADD COLUMN IF NOT EXISTS last_poll_response jsonb;
