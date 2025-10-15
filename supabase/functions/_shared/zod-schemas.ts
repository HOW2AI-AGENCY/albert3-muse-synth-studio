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
  prompt: z.string().min(1).max(3000).trim(),
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
  wait_audio: z.boolean().optional()
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
