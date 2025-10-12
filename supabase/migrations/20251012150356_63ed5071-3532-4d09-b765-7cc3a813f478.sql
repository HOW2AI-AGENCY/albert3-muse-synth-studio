-- ============================================================================
-- Mureka AI Integration Database Schema
-- Version: 1.0.0
-- Created: 2025-10-17
-- Description: Adds support for Mureka AI provider including song recognition
--              and AI-powered track description features
-- ============================================================================

-- ============================================================================
-- EXTEND TRACKS TABLE WITH PROVIDER SUPPORT
-- ============================================================================

-- Add provider column to distinguish between different AI music providers
ALTER TABLE public.tracks 
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'suno' 
    CHECK (provider IN ('suno', 'mureka', 'replicate'));

-- Create index for efficient provider-based queries
CREATE INDEX IF NOT EXISTS idx_tracks_provider ON public.tracks(provider);

-- Add column comment for documentation
COMMENT ON COLUMN public.tracks.provider IS 'Music generation provider: suno (default), mureka (O1 system), replicate';

-- ============================================================================
-- CREATE SONG_RECOGNITIONS TABLE (Shazam-like feature)
-- ============================================================================

/**
 * Table: song_recognitions
 * Purpose: Store Mureka song recognition results (identify songs from audio)
 * Features: User-owned, supports status tracking, confidence scores, external IDs
 */
CREATE TABLE IF NOT EXISTS public.song_recognitions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Input data
  audio_file_url TEXT NOT NULL,
  mureka_file_id TEXT, -- File ID after upload to Mureka
  
  -- Task tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  mureka_task_id TEXT,
  
  -- Recognition results
  recognized_title TEXT,
  recognized_artist TEXT,
  recognized_album TEXT,
  release_date TEXT,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- External service IDs (Spotify, Apple Music, etc.)
  external_ids JSONB DEFAULT '{}'::jsonb,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_recognitions_user_id ON public.song_recognitions(user_id);
CREATE INDEX idx_recognitions_status ON public.song_recognitions(status);
CREATE INDEX idx_recognitions_task_id ON public.song_recognitions(mureka_task_id) 
  WHERE mureka_task_id IS NOT NULL;
CREATE INDEX idx_recognitions_confidence ON public.song_recognitions(confidence_score DESC) 
  WHERE confidence_score IS NOT NULL;

-- Table comment
COMMENT ON TABLE public.song_recognitions IS 'Mureka AI song recognition results (Shazam-like identification)';
COMMENT ON COLUMN public.song_recognitions.confidence_score IS 'Recognition confidence (0-1), higher is better';
COMMENT ON COLUMN public.song_recognitions.external_ids IS 'External service IDs (e.g., {"spotify": "track_id", "apple_music": "id"})';

-- ============================================================================
-- RLS POLICIES FOR SONG_RECOGNITIONS
-- ============================================================================

-- Enable RLS
ALTER TABLE public.song_recognitions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own recognitions
CREATE POLICY "Users can view own recognitions"
  ON public.song_recognitions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own recognitions
CREATE POLICY "Users can insert own recognitions"
  ON public.song_recognitions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recognitions
CREATE POLICY "Users can update own recognitions"
  ON public.song_recognitions FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: System can insert recognitions (for Edge Functions)
CREATE POLICY "System can insert recognitions"
  ON public.song_recognitions FOR INSERT
  WITH CHECK (true);

-- Policy: System can update recognitions (for callback handlers)
CREATE POLICY "System can update recognitions"
  ON public.song_recognitions FOR UPDATE
  USING (true);

-- ============================================================================
-- CREATE SONG_DESCRIPTIONS TABLE (AI track analysis)
-- ============================================================================

/**
 * Table: song_descriptions
 * Purpose: Store Mureka AI-powered track analysis and descriptions
 * Features: Linked to tracks table, supports detailed audio analysis
 */
CREATE TABLE IF NOT EXISTS public.song_descriptions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Input data
  audio_file_url TEXT NOT NULL,
  mureka_file_id TEXT,
  
  -- Task tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  mureka_task_id TEXT,
  
  -- AI analysis results
  ai_description TEXT, -- Natural language description
  detected_genre TEXT,
  detected_mood TEXT,
  detected_instruments TEXT[], -- Array of instrument names
  tempo_bpm INTEGER CHECK (tempo_bpm > 0 AND tempo_bpm <= 300),
  key_signature TEXT, -- e.g., "C Major", "Am"
  
  -- Audio characteristics (0-100 scale)
  energy_level INTEGER CHECK (energy_level >= 0 AND energy_level <= 100),
  danceability INTEGER CHECK (danceability >= 0 AND danceability <= 100),
  valence INTEGER CHECK (valence >= 0 AND valence <= 100), -- Positivity/Negativity
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(track_id) -- One description per track
);

-- Indexes for performance
CREATE INDEX idx_descriptions_track_id ON public.song_descriptions(track_id);
CREATE INDEX idx_descriptions_user_id ON public.song_descriptions(user_id);
CREATE INDEX idx_descriptions_status ON public.song_descriptions(status);
CREATE INDEX idx_descriptions_task_id ON public.song_descriptions(mureka_task_id) 
  WHERE mureka_task_id IS NOT NULL;
CREATE INDEX idx_descriptions_genre ON public.song_descriptions(detected_genre) 
  WHERE detected_genre IS NOT NULL;
CREATE INDEX idx_descriptions_mood ON public.song_descriptions(detected_mood) 
  WHERE detected_mood IS NOT NULL;

-- Table comment
COMMENT ON TABLE public.song_descriptions IS 'Mureka AI-powered track analysis and descriptions';
COMMENT ON COLUMN public.song_descriptions.ai_description IS 'Natural language description generated by AI';
COMMENT ON COLUMN public.song_descriptions.valence IS 'Musical positivity (0-100): 0=sad/negative, 100=happy/positive';
COMMENT ON COLUMN public.song_descriptions.detected_instruments IS 'Array of detected instruments (e.g., ["piano", "drums", "guitar"])';

-- ============================================================================
-- RLS POLICIES FOR SONG_DESCRIPTIONS
-- ============================================================================

-- Enable RLS
ALTER TABLE public.song_descriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view descriptions of their own tracks
CREATE POLICY "Users can view descriptions of own tracks"
  ON public.song_descriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = song_descriptions.track_id
        AND tracks.user_id = auth.uid()
    )
  );

-- Policy: Users can view descriptions of public tracks
CREATE POLICY "Users can view descriptions of public tracks"
  ON public.song_descriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = song_descriptions.track_id
        AND tracks.is_public = true
    )
  );

-- Policy: Users can insert descriptions for their own tracks
CREATE POLICY "Users can insert descriptions for own tracks"
  ON public.song_descriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks
      WHERE tracks.id = song_descriptions.track_id
        AND tracks.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own descriptions
CREATE POLICY "Users can update own descriptions"
  ON public.song_descriptions FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: System can insert descriptions (for Edge Functions)
CREATE POLICY "System can insert descriptions"
  ON public.song_descriptions FOR INSERT
  WITH CHECK (true);

-- Policy: System can update descriptions (for callback handlers)
CREATE POLICY "System can update descriptions"
  ON public.song_descriptions FOR UPDATE
  USING (true);

-- ============================================================================
-- EXTEND LYRICS_JOBS TABLE FOR MUREKA SUPPORT
-- ============================================================================

-- Add provider column to lyrics_jobs
ALTER TABLE public.lyrics_jobs
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'suno' 
    CHECK (provider IN ('suno', 'mureka'));

-- Add support for lyrics extension (Mureka feature)
ALTER TABLE public.lyrics_jobs
  ADD COLUMN IF NOT EXISTS is_extension BOOLEAN DEFAULT FALSE;

-- Add base lyrics for extension operations
ALTER TABLE public.lyrics_jobs
  ADD COLUMN IF NOT EXISTS base_lyrics TEXT;

-- Column comments
COMMENT ON COLUMN public.lyrics_jobs.provider IS 'Lyrics generation provider: suno or mureka';
COMMENT ON COLUMN public.lyrics_jobs.is_extension IS 'True if extending existing lyrics (Mureka feature)';
COMMENT ON COLUMN public.lyrics_jobs.base_lyrics IS 'Existing lyrics to extend from (for is_extension=true)';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger for song_recognitions
CREATE TRIGGER update_song_recognitions_updated_at 
  BEFORE UPDATE ON public.song_recognitions
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for song_descriptions
CREATE TRIGGER update_song_descriptions_updated_at 
  BEFORE UPDATE ON public.song_descriptions
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Function: get_user_mureka_stats
 * Purpose: Get aggregated Mureka usage statistics for a user
 * Security: STABLE, allows caching
 */
CREATE OR REPLACE FUNCTION public.get_user_mureka_stats(user_uuid UUID)
RETURNS TABLE (
  total_tracks INTEGER,
  total_recognitions INTEGER,
  total_descriptions INTEGER,
  successful_recognitions INTEGER,
  avg_recognition_confidence NUMERIC
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    COUNT(DISTINCT t.id)::INTEGER AS total_tracks,
    COUNT(DISTINCT r.id)::INTEGER AS total_recognitions,
    COUNT(DISTINCT d.id)::INTEGER AS total_descriptions,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed')::INTEGER AS successful_recognitions,
    AVG(r.confidence_score) FILTER (WHERE r.status = 'completed') AS avg_recognition_confidence
  FROM public.tracks t
  FULL OUTER JOIN public.song_recognitions r ON r.user_id = user_uuid
  FULL OUTER JOIN public.song_descriptions d ON d.user_id = user_uuid
  WHERE t.user_id = user_uuid AND t.provider = 'mureka';
$$;

COMMENT ON FUNCTION public.get_user_mureka_stats IS 'Get aggregated Mureka AI usage statistics for a user';

-- ============================================================================
-- INDEXES FOR ANALYTICS
-- ============================================================================

-- Index for provider-based analytics
CREATE INDEX IF NOT EXISTS idx_tracks_provider_created_at 
  ON public.tracks(provider, created_at DESC);

-- Index for recognition analytics
CREATE INDEX IF NOT EXISTS idx_recognitions_created_at 
  ON public.song_recognitions(created_at DESC);

-- Index for description analytics
CREATE INDEX IF NOT EXISTS idx_descriptions_created_at 
  ON public.song_descriptions(created_at DESC);