-- Create audio_library table for user's audio files
CREATE TABLE IF NOT EXISTS audio_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  
  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'recording', 'generated')),
  source_metadata JSONB DEFAULT '{}',
  
  -- Processing
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_data JSONB,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  folder TEXT,
  description TEXT,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Recognition results (if applicable)
  recognized_song_id UUID REFERENCES song_recognitions(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_audio_library_user ON audio_library(user_id);
CREATE INDEX idx_audio_library_source ON audio_library(user_id, source_type);
CREATE INDEX idx_audio_library_favorite ON audio_library(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_audio_library_folder ON audio_library(user_id, folder) WHERE folder IS NOT NULL;
CREATE INDEX idx_audio_library_tags ON audio_library USING GIN(tags);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_audio_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audio_library_updated_at
  BEFORE UPDATE ON audio_library
  FOR EACH ROW
  EXECUTE FUNCTION update_audio_library_updated_at();

-- Enable RLS
ALTER TABLE audio_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own audio library"
  ON audio_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio library"
  ON audio_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio library"
  ON audio_library FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio library"
  ON audio_library FOR DELETE
  USING (auth.uid() = user_id);