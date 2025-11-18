-- supabase/migrations/20251117152500_create_prompt_dj_presets_table.sql

CREATE TABLE prompt_dj_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  prompts JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE prompt_dj_presets ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own presets" ON prompt_dj_presets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets" ON prompt_dj_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets" ON prompt_dj_presets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets" ON prompt_dj_presets
  FOR DELETE USING (auth.uid() = user_id);

-- Create a trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_prompt_dj_presets_updated
  BEFORE UPDATE ON prompt_dj_presets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
