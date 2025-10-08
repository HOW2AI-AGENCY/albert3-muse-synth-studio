-- This migration creates the generation_requests table to log all AI generation tasks.
-- It replaces a previous, incorrect migration.
-- Key features:
-- - UUID primary key to align with application logic.
-- - Foreign key constraints to users and tracks.
-- - Indexes on frequently queried columns.
-- - Row-Level Security (RLS) policies to ensure users can only access their own data.

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

-- Add indexes for performance
CREATE INDEX idx_generation_requests_user_id ON public.generation_requests(user_id);
CREATE INDEX idx_generation_requests_status ON public.generation_requests(status);
CREATE INDEX idx_generation_requests_created_at ON public.generation_requests(created_at DESC);
CREATE INDEX idx_generation_requests_track_id ON public.generation_requests(track_id);
CREATE INDEX idx_generation_requests_provider ON public.generation_requests(provider);

-- Enable RLS
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;

-- Policies for user access
CREATE POLICY "Users can view their own requests"
  ON public.generation_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requests"
  ON public.generation_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests"
  ON public.generation_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- The service_role key bypasses RLS, so no explicit policy is needed for admin/backend operations.