-- Add progress tracking to tracks table
ALTER TABLE public.tracks 
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100);

-- Create track retry attempts table
CREATE TABLE IF NOT EXISTS public.track_retry_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  error_message TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_track_retry_attempts_track_id 
  ON public.track_retry_attempts(track_id);

-- Enable RLS
ALTER TABLE public.track_retry_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view retry attempts for their own tracks
CREATE POLICY "Users can view retry attempts for their tracks"
  ON public.track_retry_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = track_retry_attempts.track_id 
        AND tracks.user_id = auth.uid()
    )
  );

-- System can insert retry attempts
CREATE POLICY "System can insert retry attempts"
  ON public.track_retry_attempts
  FOR INSERT
  WITH CHECK (true);

-- Create callback logs table for detailed error tracking
CREATE TABLE IF NOT EXISTS public.callback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  callback_type TEXT NOT NULL,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_callback_logs_track_id 
  ON public.callback_logs(track_id);

CREATE INDEX IF NOT EXISTS idx_callback_logs_created_at 
  ON public.callback_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.callback_logs ENABLE ROW LEVEL SECURITY;

-- Users can view callback logs for their own tracks
CREATE POLICY "Users can view callback logs for their tracks"
  ON public.callback_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks 
      WHERE tracks.id = callback_logs.track_id 
        AND tracks.user_id = auth.uid()
    )
  );

-- Admins can view all callback logs
CREATE POLICY "Admins can view all callback logs"
  ON public.callback_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert callback logs
CREATE POLICY "System can insert callback logs"
  ON public.callback_logs
  FOR INSERT
  WITH CHECK (true);