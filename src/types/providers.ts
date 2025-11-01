/**
 * Shared Provider Types
 * ✅ Single source of truth for provider-related types
 * 
 * @module types/providers
 * @version 3.1.0
 * @since 2025-11-02
 */

export type { MusicProvider } from '@/config/provider-models';
export type { 
  GenerationParams,
  ExtensionParams,
  StemSeparationParams,
  GenerationResult,
  TrackData,
  TaskStatus,
  BalanceInfo,
  ProviderCapabilities,
  ProviderConfig
} from '@/services/providers/types';

/**
 * Track status types - used across frontend and backend
 */
export type TrackStatus = 'pending' | 'preparing' | 'processing' | 'completed' | 'failed';

/**
 * Stem separation types
 */
export type StemType = 'vocals' | 'instrumental' | 'drums' | 'bass' | 'guitar' | 
  'keyboard' | 'percussion' | 'strings' | 'synth' | 'fx' | 'brass' | 'woodwinds' | 'backing_vocals';

export type SeparationMode = 'separate_vocal' | 'split_stem';

/**
 * Provider-specific model types
 */
export type SunoModel = 'V5' | 'V4_5PLUS' | 'V4_5' | 'V4' | 'V3_5';
export type MurekaModel = 'auto' | 'mureka-6' | 'mureka-7.5' | 'mureka-o1';

/**
 * Vocal gender options
 */
export type VocalGender = 'm' | 'f' | 'any';

/**
 * Provider feature flags
 */
export interface ProviderFeatures {
  supportsExtend: boolean;
  supportsStems: boolean;
  supportsLyrics: boolean;
  supportsRecognition?: boolean;
  supportsDescription?: boolean;
  supportsCover?: boolean;
  supportsCustomMode?: boolean;
  supportsReferenceAudio: boolean;
}

/**
 * Provider limits and quotas
 */
export interface ProviderLimits {
  maxDuration: number; // seconds
  maxConcurrent: number;
  maxPromptLength: number;
  maxLyricsLength: number;
  maxTags: number;
}

/**
 * Error types for provider operations
 */
export type ProviderErrorCode = 
  | 'INVALID_PARAMS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INSUFFICIENT_CREDITS'
  | 'PROVIDER_ERROR'
  | 'TIMEOUT'
  | 'INVALID_MODEL'
  | 'UNSUPPORTED_FEATURE';

export interface ProviderError {
  code: ProviderErrorCode;
  message: string;
  provider: string;
  details?: Record<string, any>;
}
