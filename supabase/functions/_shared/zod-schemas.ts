/**
 * Zod validation schemas for edge functions
 * Provides type-safe input validation to prevent malformed data
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ✅ Suno model versions enum
export const SUNO_MODELS = [
  'chirp-v3-5',
  'chirp-v3-0',
  'chirp-v2-0',
  'V5',
  'V4'
] as const;

// ✅ Separation modes enum
export const SEPARATION_MODES = [
  'split_stem',
  'separate_vocal',
  '2stems',
  '4stems',
  '5stems'
] as const;

// ✅ URL validation (HTTPS only, no dangerous protocols)
export const httpsUrlSchema = z.string().url().refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'URL must use HTTPS protocol' }
);

// ✅ UUID validation
export const uuidSchema = z.string().uuid();

// ✅ generate-suno request schema
export const generateSunoSchema = z.object({
  trackId: uuidSchema.optional(),
  prompt: z.string().min(1).max(3000).trim().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  title: z.string().max(200).optional(),
  make_instrumental: z.boolean().optional(),
  model_version: z.enum(SUNO_MODELS).optional(),
  lyrics: z.string().max(3000).nullable().optional(),
  hasVocals: z.boolean().optional(),
  customMode: z.boolean().optional(),
  negativeTags: z.string().max(500).optional(),
  vocalGender: z.enum(['m', 'f']).optional(),
  styleWeight: z.number().min(0).max(100).optional(),
  weirdnessConstraint: z.number().min(0).max(100).optional(),
  audioWeight: z.number().min(0).max(100).optional(),
  referenceAudioUrl: httpsUrlSchema.optional(),
  referenceTrackId: uuidSchema.optional(),
  idempotencyKey: uuidSchema.optional(),
  wait_audio: z.boolean().optional(),
  projectId: uuidSchema.optional(), // ✅ НОВОЕ: ID проекта
  personaId: uuidSchema.optional(), // ✅ НОВОЕ: ID персоны (уже есть в хендлере)
}).refine(data => data.prompt || data.lyrics, {
  message: "Either 'prompt' or 'lyrics' must be provided.",
  path: ["prompt"],
}).refine(data => {
  if (data.customMode) {
    return !!data.lyrics;
  }
  return true;
}, {
  message: "'lyrics' are required when 'customMode' is true.",
  path: ["lyrics"],
}).refine(data => !(data.referenceAudioUrl && data.referenceTrackId), {
  message: "Cannot provide both 'referenceAudioUrl' and 'referenceTrackId'.",
  path: ["referenceAudioUrl"],
});

// ✅ extend-track request schema
export const extendTrackSchema = z.object({
  trackId: uuidSchema,
  audioUrl: httpsUrlSchema.optional(),
  prompt: z.string().max(3000).optional(),
  continueAt: z.number().min(0).max(300).optional(),
  tags: z.array(z.string().max(50)).max(20).optional()
});

// ✅ create-cover request schema
export const createCoverSchema = z.object({
  trackId: uuidSchema.optional(),
  referenceTrackId: uuidSchema.optional(),
  audioUrl: httpsUrlSchema.optional(),
  prompt: z.string().max(3000).optional(),
  title: z.string().max(200).optional()
});

// ✅ separate-stems request schema
export const separateStemsSchema = z.object({
  trackId: uuidSchema,
  versionId: uuidSchema.optional(),
  separationMode: z.enum(SEPARATION_MODES)
});

// ✅ improve-prompt request schema
export const improvePromptSchema = z.object({
  prompt: z.string().min(1).max(3000).trim(),
  context: z.string().max(1000).optional()
});

// ✅ Suno callback payload schema
export const sunoCallbackSchema = z.object({
  data: z.union([
    z.object({
      task_id: z.string().min(1),
      data: z.array(z.object({
        status: z.string(),
        audioUrl: httpsUrlSchema.optional(),
        audio_url: httpsUrlSchema.optional(),
        stream_audio_url: httpsUrlSchema.optional(),
        source_stream_audio_url: httpsUrlSchema.optional(),
        title: z.string().max(500).optional(),
        lyrics: z.string().max(10000).optional(),
        duration: z.number().positive().optional(),
        id: z.string().optional(),
        image_url: httpsUrlSchema.optional(),
        image_large_url: httpsUrlSchema.optional(),
        video_url: httpsUrlSchema.optional(),
        tags: z.union([z.string(), z.array(z.string())]).optional()
      }))
    }),
    z.array(z.object({
      audioUrl: httpsUrlSchema.optional()
    }))
  ])
});

// ✅ Lyrics callback payload schema
export const lyricsCallbackSchema = z.object({
  code: z.number().optional(),
  msg: z.string().optional(),
  data: z.object({
    callbackType: z.string().optional(),
    taskId: z.string().optional(),
    task_id: z.string().optional(),
    data: z.array(z.object({
      id: z.string().optional(),
      text: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
      errorMessage: z.string().optional()
    })).optional().nullable()
  }).optional().nullable()
});

// ✅ Stems callback payload schema
export const stemsCallbackSchema = z.object({
  code: z.number().optional(),
  msg: z.string().optional(),
  data: z.object({
    task_id: z.string().optional(),
    taskId: z.string().optional()
  }).optional()
});

// ✅ analyze-reference-audio request schema
export const analyzeReferenceAudioSchema = z.object({
  audioUrl: httpsUrlSchema,
  trackId: uuidSchema.optional()
});

// ✅ Track metadata schema (JSONB validation)
export const trackMetadataSchema = z.object({
  // Suno-specific
  suno_id: z.string().optional(),
  suno_task_id: z.string().optional(),
  model_version: z.string().optional(),
  negative_tags: z.string().optional(),
  vocal_gender: z.enum(['m', 'f']).optional(),
  style_weight: z.number().min(0).max(100).optional(),
  weirdness_constraint: z.number().min(0).max(100).optional(),
  audio_weight: z.number().min(0).max(100).optional(),
  reference_audio_url: httpsUrlSchema.optional(),
  custom_mode: z.boolean().optional(),
  
  // Mureka-specific
  mureka_task_id: z.string().optional(),
  is_bgm: z.boolean().optional(),
  reference_file_id: z.string().optional(),
  
  // AI Description
  ai_description: z.string().optional(),
  detected_genre: z.string().optional(),
  detected_mood: z.string().optional(),
  detected_instruments: z.array(z.string()).optional(),
  tempo_bpm: z.number().positive().optional(),
  key_signature: z.string().optional(),
  energy_level: z.number().min(0).max(100).optional(),
  danceability: z.number().min(0).max(100).optional(),
  valence: z.number().min(0).max(100).optional(),
  description_updated_at: z.string().optional(),
  description_migrated_at: z.string().optional(),
  
  // Extension/Cover
  extended_from: uuidSchema.optional(),
  continue_at: z.number().min(0).optional(),
  extension_prompt: z.string().optional(),
  is_cover: z.boolean().optional(),
  reference_track_id: uuidSchema.optional(),
  
  // Analysis
  analyzed_bpm: z.number().positive().optional(),
  analyzed_key: z.string().optional(),
  spectral_features: z.record(z.number()).optional(),
  analyzed_at: z.string().optional(),
  
  // Timestamps
  completed_at: z.string().optional(),
}).passthrough(); // Allow additional fields

// ✅ create-music-video request schema
export const createMusicVideoSchema = z.object({
  trackId: uuidSchema,
  audioId: z.string().min(1),
  author: z.string().max(50).optional(),
  domainName: z.string().max(50).optional()
});

// ✅ music-video callback payload schema
export const musicVideoCallbackSchema = z.object({
  code: z.number(),
  msg: z.string().optional(),
  data: z.object({
    task_id: z.string(),
    video_url: httpsUrlSchema.optional().nullable()
  })
});

// ✅ Helper function to validate and parse
export function validateAndParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
