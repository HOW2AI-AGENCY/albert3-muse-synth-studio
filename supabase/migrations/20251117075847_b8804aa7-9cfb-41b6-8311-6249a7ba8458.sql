-- ============================================================================
-- Music Classification System - Phase 1: Database Schema
-- ============================================================================
-- Created: 2025-11-17
-- Purpose: Integration of MTG Music Classifiers and Discogs EfficientNet
-- Author: AI Development Team
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- TABLE: music_classifications
-- Purpose: Store detailed classification results with confidence scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.music_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Track references
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.track_versions(id) ON DELETE CASCADE,
  
  -- Classifier metadata
  classifier_type TEXT NOT NULL CHECK (
    classifier_type IN (
      'mtg-musicnn-msd-2',
      'mtg-vggish-audioset', 
      'effnet-discogs'
    )
  ),
  classifier_version TEXT,
  
  -- Primary classification results
  primary_genre TEXT,
  primary_mood TEXT,
  primary_style TEXT, -- For Discogs taxonomy
  confidence_score NUMERIC(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Detailed ranked results (top_n)
  genres_ranked JSONB DEFAULT '[]'::jsonb,
  moods_ranked JSONB DEFAULT '[]'::jsonb,
  styles_ranked JSONB DEFAULT '[]'::jsonb, -- For Discogs
  
  -- Instruments detection
  instruments_detected TEXT[] DEFAULT ARRAY[]::TEXT[],
  instruments_ranked JSONB DEFAULT '[]'::jsonb,
  
  -- Embeddings for future ML/similarity search
  embeddings JSONB,
  
  -- Replicate metadata
  replicate_prediction_id TEXT,
  processing_time_ms INTEGER,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(track_id, version_id, classifier_type),
  CHECK (
    -- Ensure at least one primary result exists when completed
    (status != 'completed') OR 
    (primary_genre IS NOT NULL OR primary_style IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_music_classifications_track_id 
  ON public.music_classifications(track_id);

CREATE INDEX idx_music_classifications_version_id 
  ON public.music_classifications(version_id) 
  WHERE version_id IS NOT NULL;

CREATE INDEX idx_music_classifications_status 
  ON public.music_classifications(status) 
  WHERE status IN ('pending', 'processing');

CREATE INDEX idx_music_classifications_classifier 
  ON public.music_classifications(classifier_type);

CREATE INDEX idx_music_classifications_primary_genre 
  ON public.music_classifications(primary_genre) 
  WHERE primary_genre IS NOT NULL;

CREATE INDEX idx_music_classifications_primary_style 
  ON public.music_classifications(primary_style) 
  WHERE primary_style IS NOT NULL;

-- GIN index for JSONB searching
CREATE INDEX idx_music_classifications_genres_ranked_gin 
  ON public.music_classifications USING GIN (genres_ranked);

CREATE INDEX idx_music_classifications_styles_ranked_gin 
  ON public.music_classifications USING GIN (styles_ranked);

-- GIN index for instruments array
CREATE INDEX idx_music_classifications_instruments_gin 
  ON public.music_classifications USING GIN (instruments_detected);

-- Enable Row Level Security
ALTER TABLE public.music_classifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own track classifications"
  ON public.music_classifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      WHERE t.id = track_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert classifications"
  ON public.music_classifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks t
      WHERE t.id = track_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "System can update classifications"
  ON public.music_classifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      WHERE t.id = track_id AND t.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TABLE: classification_jobs
-- Purpose: Track background classification tasks (similar to audio_upscale_jobs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.classification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and track references
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  version_id UUID REFERENCES public.track_versions(id) ON DELETE SET NULL,
  
  -- Input configuration
  input_audio_url TEXT NOT NULL,
  classifier_type TEXT NOT NULL CHECK (
    classifier_type IN (
      'mtg-musicnn',
      'mtg-vggish',
      'effnet-discogs',
      'both'
    )
  ),
  classifier_config JSONB DEFAULT '{}'::jsonb,
  
  -- Replicate tracking
  replicate_prediction_id TEXT,
  
  -- Output
  classification_id UUID REFERENCES public.music_classifications(id) ON DELETE SET NULL,
  output_visualization_url TEXT, -- URL to PNG visualization (Discogs)
  raw_output JSONB,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 3),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CHECK (
    -- Ensure completed_at is set when status is completed
    (status != 'completed') OR (completed_at IS NOT NULL)
  ),
  CHECK (
    -- Ensure classification_id is set when status is completed
    (status != 'completed') OR (classification_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_classification_jobs_user_id 
  ON public.classification_jobs(user_id);

CREATE INDEX idx_classification_jobs_track_id 
  ON public.classification_jobs(track_id) 
  WHERE track_id IS NOT NULL;

CREATE INDEX idx_classification_jobs_version_id 
  ON public.classification_jobs(version_id) 
  WHERE version_id IS NOT NULL;

CREATE INDEX idx_classification_jobs_status 
  ON public.classification_jobs(status) 
  WHERE status IN ('pending', 'processing');

CREATE INDEX idx_classification_jobs_prediction_id 
  ON public.classification_jobs(replicate_prediction_id) 
  WHERE replicate_prediction_id IS NOT NULL;

CREATE INDEX idx_classification_jobs_created_at 
  ON public.classification_jobs(created_at DESC);

-- Composite index for cleanup queries
CREATE INDEX idx_classification_jobs_status_created 
  ON public.classification_jobs(status, created_at) 
  WHERE status IN ('pending', 'processing');

-- Enable Row Level Security
ALTER TABLE public.classification_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own classification jobs"
  ON public.classification_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create classification jobs"
  ON public.classification_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own jobs"
  ON public.classification_jobs FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGER: Auto-update timestamps
-- ============================================================================

-- Reuse existing trigger function for updated_at
CREATE TRIGGER update_music_classifications_updated_at
  BEFORE UPDATE ON public.music_classifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classification_jobs_updated_at
  BEFORE UPDATE ON public.classification_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FUNCTION: Cleanup old classification jobs
-- Purpose: Remove old completed/failed jobs to prevent table bloat
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_classification_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completed/failed jobs older than 30 days
  WITH deleted AS (
    DELETE FROM public.classification_jobs
    WHERE 
      status IN ('completed', 'failed', 'cancelled')
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.cleanup_old_classification_jobs() IS 
  'Removes classification jobs older than 30 days (completed/failed only)';

-- ============================================================================
-- COMMENTS: Table and column documentation
-- ============================================================================

COMMENT ON TABLE public.music_classifications IS 
  'Stores detailed music classification results from MTG and Discogs models';

COMMENT ON COLUMN public.music_classifications.classifier_type IS 
  'Type of classifier used: mtg-musicnn-msd-2, mtg-vggish-audioset, or effnet-discogs';

COMMENT ON COLUMN public.music_classifications.genres_ranked IS 
  'Array of {genre: string, score: number} objects sorted by confidence';

COMMENT ON COLUMN public.music_classifications.styles_ranked IS 
  'Array of {style: string, score: number} objects for Discogs taxonomy';

COMMENT ON COLUMN public.music_classifications.instruments_ranked IS 
  'Array of {instrument: string, score: number} objects sorted by detection confidence';

COMMENT ON COLUMN public.music_classifications.embeddings IS 
  'Audio embeddings for similarity search and ML applications';

COMMENT ON TABLE public.classification_jobs IS 
  'Tracks background classification tasks with status and error handling';

COMMENT ON COLUMN public.classification_jobs.classifier_config IS 
  'Configuration parameters: {model_type: string, top_n: number, output_format: string}';

COMMENT ON COLUMN public.classification_jobs.retry_count IS 
  'Number of retry attempts (max 3) for failed classifications';