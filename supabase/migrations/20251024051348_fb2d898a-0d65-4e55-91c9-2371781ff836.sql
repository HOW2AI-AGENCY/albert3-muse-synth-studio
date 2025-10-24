-- Create saved_lyrics table for user's lyrics library
CREATE TABLE IF NOT EXISTS saved_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES lyrics_jobs(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES lyrics_variants(id) ON DELETE SET NULL,
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  prompt TEXT,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  genre TEXT,
  mood TEXT,
  language TEXT DEFAULT 'ru',
  
  -- Organization
  is_favorite BOOLEAN DEFAULT false,
  folder TEXT,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_variant UNIQUE(user_id, variant_id)
);

-- Create indexes for performance
CREATE INDEX idx_saved_lyrics_user ON saved_lyrics(user_id);
CREATE INDEX idx_saved_lyrics_tags ON saved_lyrics USING GIN(tags);
CREATE INDEX idx_saved_lyrics_favorite ON saved_lyrics(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_saved_lyrics_folder ON saved_lyrics(user_id, folder) WHERE folder IS NOT NULL;

-- Add full-text search
ALTER TABLE saved_lyrics
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(prompt, ''))
) STORED;

CREATE INDEX idx_saved_lyrics_search ON saved_lyrics USING GIN(search_vector);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_lyrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_saved_lyrics_updated_at
  BEFORE UPDATE ON saved_lyrics
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_lyrics_updated_at();

-- Enable RLS
ALTER TABLE saved_lyrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own saved lyrics"
  ON saved_lyrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved lyrics"
  ON saved_lyrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved lyrics"
  ON saved_lyrics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved lyrics"
  ON saved_lyrics FOR DELETE
  USING (auth.uid() = user_id);