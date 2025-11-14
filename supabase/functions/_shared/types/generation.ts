/**
 * Shared types for music generation across providers
 * Used by GenerationHandler and provider-specific implementations
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============= Request Types =============

export interface BaseGenerationParams {
  trackId?: string;
  title?: string;
  prompt: string;
  lyrics?: string | null;
  styleTags?: string[];
  hasVocals?: boolean;
  modelVersion?: string;
  idempotencyKey?: string;
}

export interface SunoGenerationParams extends BaseGenerationParams {
  make_instrumental?: boolean;
  wait_audio?: boolean;
  customMode?: boolean;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  referenceAudioUrl?: string;
  referenceTrackId?: string;
  personaId?: string; // ✅ ID Suno Persona
  projectId?: string; // ✅ Active project ID for track
  inspoProjectId?: string; // ✅ Inspiration project ID (source)
  numClips?: number;
}

export interface MurekaGenerationParams extends BaseGenerationParams {
  isBGM?: boolean;
}

// ============= Response Types =============

export interface GenerationResult {
  success: true;
  trackId: string;
  taskId?: string;
  message: string;
  requiresLyricsSelection?: boolean;
  jobId?: string;
}

export interface GenerationError {
  success: false;
  error: string;
  trackId?: string;
  suggestion?: string;
}

export type GenerationResponse = GenerationResult | GenerationError;

// ============= Provider Response Types =============

/**
 * Track status during generation lifecycle
 * - pending: Track created, waiting to start generation (no lyrics yet)
 * - draft: Track has lyrics, ready for generation
 * - preparing: Provider is preparing resources (Mureka specific)
 * - processing: Active generation in progress
 * - completed: Generation finished successfully
 * - failed: Generation failed with error
 */
export type TrackStatus = 'pending' | 'draft' | 'preparing' | 'processing' | 'completed' | 'failed';

export interface ProviderTrackData {
  status: TrackStatus;
  audio_url?: string;
  cover_url?: string;
  video_url?: string;
  duration?: number;
  title?: string;
  error?: string;
  metadata?: Record<string, unknown>; // ✅ Optional metadata for streaming URLs, etc.
}

// ============= Polling Types =============

export interface PollingConfig {
  intervalMs: number;
  maxAttempts: number;
  timeoutMs: number;
}

export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  intervalMs: 2000,  // 2 seconds
  maxAttempts: 300,   // 10 minutes total
  timeoutMs: 600000,  // 10 minutes
};

// ============= Metadata Types =============

export interface TrackMetadata {
  provider: 'suno' | 'mureka';
  originalPrompt?: string;
  generatedLyrics?: boolean;
  stage?: string;
  stage_description?: string;
  [key: string]: unknown;
}

// ============= Validation Schemas =============

export const uuidSchema = z.string().uuid();

export const baseGenerationSchema = z.object({
  trackId: uuidSchema.optional(),
  title: z.string().max(200).optional(),
  prompt: z.string().min(1).max(3000).trim(),
  lyrics: z.string().max(3000).nullable().optional(),
  styleTags: z.array(z.string().max(50)).max(20).optional(),
  hasVocals: z.boolean().optional(),
  modelVersion: z.string().max(50).optional(),
  idempotencyKey: uuidSchema.optional(),
});
