CREATE TABLE IF NOT EXISTS public.generation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('suno', 'replicate')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generation_requests_user_id ON public.generation_requests(user_id);
CREATE INDEX idx_generation_requests_status ON public.generation_requests(status);
CREATE INDEX idx_generation_requests_created_at ON public.generation_requests(created_at DESC);

-- RLS Policies
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON public.generation_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all"
  ON public.generation_requests FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');