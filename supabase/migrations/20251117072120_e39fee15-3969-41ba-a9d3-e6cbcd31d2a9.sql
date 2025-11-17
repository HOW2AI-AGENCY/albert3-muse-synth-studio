-- Create audio_upscale_jobs table for tracking upscale tasks
CREATE TABLE IF NOT EXISTS public.audio_upscale_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  
  -- Audio URLs
  input_audio_url TEXT NOT NULL,
  output_audio_url TEXT,
  
  -- Replicate info
  replicate_prediction_id TEXT,
  model_version TEXT DEFAULT 'sakemin/audiosr-long-audio',
  
  -- Parameters
  truncated_batches BOOLEAN DEFAULT true,
  ddim_steps INTEGER DEFAULT 50,
  guidance_scale NUMERIC DEFAULT 3.5,
  seed INTEGER,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.audio_upscale_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own upscale jobs"
  ON public.audio_upscale_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own upscale jobs"
  ON public.audio_upscale_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upscale jobs"
  ON public.audio_upscale_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_audio_upscale_jobs_user_id ON public.audio_upscale_jobs(user_id);
CREATE INDEX idx_audio_upscale_jobs_track_id ON public.audio_upscale_jobs(track_id);
CREATE INDEX idx_audio_upscale_jobs_status ON public.audio_upscale_jobs(status);
CREATE INDEX idx_audio_upscale_jobs_prediction_id ON public.audio_upscale_jobs(replicate_prediction_id);

-- Auto-update timestamp trigger
CREATE TRIGGER update_audio_upscale_jobs_updated_at
  BEFORE UPDATE ON public.audio_upscale_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();