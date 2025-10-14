-- Create prompt_history table for saving user prompts
CREATE TABLE IF NOT EXISTS public.prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  lyrics TEXT,
  style_tags TEXT[],
  genre TEXT,
  mood TEXT,
  provider TEXT DEFAULT 'suno',
  is_template BOOLEAN DEFAULT false,
  template_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_prompt_history_user_id ON public.prompt_history(user_id);
CREATE INDEX idx_prompt_history_last_used ON public.prompt_history(last_used_at DESC);
CREATE INDEX idx_prompt_history_templates ON public.prompt_history(user_id, is_template) WHERE is_template = true;

-- Enable RLS
ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own prompt history"
  ON public.prompt_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompt history"
  ON public.prompt_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompt history"
  ON public.prompt_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompt history"
  ON public.prompt_history
  FOR DELETE
  USING (auth.uid() = user_id);