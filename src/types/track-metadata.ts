/**
 * Track Metadata Type Definitions
 * Provides strict typing for tracks.metadata JSONB field
 */

// ============================================================================
// Base Metadata Types
// ============================================================================

/**
 * Suno-specific metadata
 */
export interface SunoMetadata {
  /** Original Suno track ID */
  suno_id?: string;
  /** Suno task ID for generation tracking */
  suno_task_id?: string;
  /** Model version used (V3_5, V4, V5, etc.) */
  model_version?: string;
  /** Negative tags to avoid */
  negative_tags?: string;
  /** Vocal gender preference */
  vocal_gender?: 'm' | 'f';
  /** Style weight (0-100) */
  style_weight?: number;
  /** Weirdness/creativity constraint (0-100) */
  weirdness_constraint?: number;
  /** Audio reference weight (0-100) */
  audio_weight?: number;
  /** Reference audio URL used */
  reference_audio_url?: string;
  /** Custom mode enabled */
  custom_mode?: boolean;
  /** Generation completed timestamp */
  completed_at?: string;
}

/**
 * Mureka-specific metadata
 */
export interface MurekaMetadata {
  /** Mureka task ID for generation tracking */
  mureka_task_id?: string;
  /** Model version used */
  model_version?: string;
  /** BGM mode (background music without vocals) */
  is_bgm?: boolean;
  /** File ID for reference audio */
  reference_file_id?: string;
  /** Generation completed timestamp */
  completed_at?: string;
}

/**
 * AI Description metadata (from describe-song)
 */
export interface AIDescriptionMetadata {
  /** AI-generated description of the track */
  ai_description?: string;
  /** Detected music genre */
  detected_genre?: string;
  /** Detected mood/emotion */
  detected_mood?: string;
  /** Detected instruments (array) */
  detected_instruments?: string[];
  /** Tempo in BPM */
  tempo_bpm?: number;
  /** Key signature (e.g., "C major", "A minor") */
  key_signature?: string;
  /** Energy level (0-100) */
  energy_level?: number;
  /** Danceability score (0-100) */
  danceability?: number;
  /** Valence/positivity (0-100) */
  valence?: number;
  /** Timestamp when description was added */
  description_updated_at?: string;
  /** Timestamp when migrated from song_descriptions */
  description_migrated_at?: string;
}

/**
 * Track extension metadata
 */
export interface ExtensionMetadata {
  /** ID of the track this was extended from */
  extended_from?: string;
  /** Position where continuation started (seconds) */
  continue_at?: number;
  /** Prompt used for extension */
  extension_prompt?: string;
  /** Whether this is a cover version */
  is_cover?: boolean;
  /** Reference track ID for cover */
  reference_track_id?: string;
}

/**
 * Analysis metadata (from reference audio analysis)
 */
export interface AnalysisMetadata {
  /** BPM detected from analysis */
  analyzed_bpm?: number;
  /** Key detected from analysis */
  analyzed_key?: string;
  /** Spectral features */
  spectral_features?: Record<string, number>;
  /** Analysis timestamp */
  analyzed_at?: string;
}

// ============================================================================
// Complete Track Metadata Interface
// ============================================================================

/**
 * Complete metadata structure for tracks table
 * Combines all possible metadata fields with strict typing
 */
export interface TrackMetadata 
  extends Partial<SunoMetadata>,
          Partial<MurekaMetadata>,
          Partial<AIDescriptionMetadata>,
          Partial<ExtensionMetadata>,
          Partial<AnalysisMetadata> {
  /** Allow additional custom fields */
  [key: string]: unknown;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if metadata contains Suno-specific fields
 */
export function isSunoMetadata(metadata: TrackMetadata): boolean {
  return metadata.suno_id !== undefined || metadata.suno_task_id !== undefined;
}

/**
 * Check if metadata contains Mureka-specific fields
 */
export function isMurekaMetadata(metadata: TrackMetadata): boolean {
  return metadata.mureka_task_id !== undefined;
}

/**
 * Check if metadata contains AI description
 */
export function hasAIDescription(metadata: TrackMetadata): metadata is Required<Pick<TrackMetadata, 'ai_description'>> {
  return typeof metadata.ai_description === 'string' && metadata.ai_description.length > 0;
}

/**
 * Check if track is an extension
 */
export function isExtension(metadata: TrackMetadata): metadata is Required<Pick<TrackMetadata, 'extended_from'>> {
  return typeof metadata.extended_from === 'string';
}

/**
 * Check if track is a cover
 */
export function isCover(metadata: TrackMetadata): metadata is Required<Pick<TrackMetadata, 'is_cover'>> {
  return metadata.is_cover === true;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely extract AI description from metadata
 */
export function getAIDescription(metadata?: TrackMetadata | null): string | null {
  if (!metadata) return null;
  const desc = metadata.ai_description;
  return typeof desc === 'string' && desc.length > 0 ? desc : null;
}

/**
 * Safely extract detected genre from metadata
 */
export function getDetectedGenre(metadata?: TrackMetadata | null): string | null {
  if (!metadata) return null;
  const genre = metadata.detected_genre;
  return typeof genre === 'string' && genre.length > 0 ? genre : null;
}

/**
 * Safely extract detected mood from metadata
 */
export function getDetectedMood(metadata?: TrackMetadata | null): string | null {
  if (!metadata) return null;
  const mood = metadata.detected_mood;
  return typeof mood === 'string' && mood.length > 0 ? mood : null;
}

/**
 * Safely extract BPM from metadata (prefers analyzed over detected)
 */
export function getBPM(metadata?: TrackMetadata | null): number | null {
  if (!metadata) return null;
  return metadata.analyzed_bpm ?? metadata.tempo_bpm ?? null;
}

/**
 * Create empty metadata object
 */
export function createEmptyMetadata(): TrackMetadata {
  return {};
}

/**
 * Merge metadata objects safely
 */
export function mergeMetadata(...metadatas: (TrackMetadata | null | undefined)[]): TrackMetadata {
  return metadatas.reduce<TrackMetadata>((acc, meta) => {
    if (!meta) return acc;
    return { ...acc, ...meta };
  }, {});
}
