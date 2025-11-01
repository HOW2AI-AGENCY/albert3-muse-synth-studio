/**
 * Unified Provider Validation Schemas
 * ✅ Shared between Frontend and Backend (Edge Functions)
 * ⚠️ Keep in sync with src/utils/provider-validation.ts
 * 
 * @module _shared/provider-validation
 * @version 3.1.0
 * @since 2025-11-02
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Supported model versions for each provider
 */
const SUNO_MODELS = ['V5', 'V4_5PLUS', 'V4_5', 'V4', 'V3_5'] as const;
const MUREKA_MODELS = ['auto', 'mureka-6', 'mureka-7.5', 'mureka-o1'] as const;

/**
 * Base generation parameters schema (common for all providers)
 */
export const baseGenerationSchema = z.object({
  trackId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  prompt: z.string().min(1, 'Prompt is required').max(3000, 'Prompt too long'),
  lyrics: z.string().max(3000).nullable().optional(),
  styleTags: z.array(z.string().max(50)).max(20).optional(),
  hasVocals: z.boolean().optional(),
  provider: z.enum(['suno', 'mureka'] as const),
  modelVersion: z.string().optional(),
});

/**
 * Suno-specific parameters schema
 */
export const sunoSpecificSchema = z.object({
  referenceAudioUrl: z.string().url().optional(),
  customMode: z.boolean().optional(),
  vocalGender: z.enum(['m', 'f', 'any']).optional(),
  styleWeight: z.number().min(0).max(1).optional(),
  lyricsWeight: z.number().min(0).max(1).optional(),
  audioWeight: z.number().min(0).max(1).optional(),
  weirdness: z.number().min(0).max(1).optional(),
  negativeTags: z.string().max(200).optional(),
});

/**
 * Mureka-specific parameters schema
 */
export const murekaSpecificSchema = z.object({
  isBGM: z.boolean().optional(),
  referenceAudioId: z.string().optional(),
});

/**
 * Complete generation parameters schema with provider validation
 */
export const GenerationParamsSchema = baseGenerationSchema
  .and(sunoSpecificSchema.partial())
  .and(murekaSpecificSchema.partial())
  .superRefine((data, ctx) => {
    // Provider-specific model validation
    if (data.provider === 'suno' && data.modelVersion) {
      if (!SUNO_MODELS.includes(data.modelVersion as any)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['modelVersion'],
          message: `Invalid Suno model. Must be one of: ${SUNO_MODELS.join(', ')}`
        });
      }
    }

    if (data.provider === 'mureka' && data.modelVersion) {
      if (!MUREKA_MODELS.includes(data.modelVersion as any)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['modelVersion'],
          message: `Invalid Mureka model. Must be one of: ${MUREKA_MODELS.join(', ')}`
        });
      }
    }

    // Suno-specific validations
    if (data.provider === 'suno') {
      if (data.customMode && !data.modelVersion) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['modelVersion'],
          message: 'Model version is required when using custom mode'
        });
      }
    }

    // Mureka-specific validations
    if (data.provider === 'mureka') {
      if (data.customMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customMode'],
          message: 'Custom mode is not supported by Mureka'
        });
      }
      if (data.vocalGender) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['vocalGender'],
          message: 'Vocal gender selection is not supported by Mureka'
        });
      }
    }
  });

/**
 * Extension parameters schema
 */
export const ExtensionParamsSchema = z.object({
  originalTrackId: z.string().uuid(),
  originalTaskId: z.string().optional(),
  prompt: z.string().min(1).max(3000),
  duration: z.number().int().min(10).max(240).optional(),
  continueAt: z.number().int().min(0).optional(),
});

/**
 * Stem separation parameters schema
 */
export const StemSeparationParamsSchema = z.object({
  trackId: z.string().uuid(),
  audioId: z.string().uuid(),
  separationType: z.enum(['separate_vocal', 'split_stem']),
});

/**
 * Validate generation parameters
 * @throws ZodError if validation fails
 */
export function validateGenerationParams(params: unknown) {
  return GenerationParamsSchema.parse(params);
}

/**
 * Validate extension parameters
 * @throws ZodError if validation fails
 */
export function validateExtensionParams(params: unknown) {
  return ExtensionParamsSchema.parse(params);
}

/**
 * Validate stem separation parameters
 * @throws ZodError if validation fails
 */
export function validateStemSeparationParams(params: unknown) {
  return StemSeparationParamsSchema.parse(params);
}

/**
 * Safe validation that returns result object instead of throwing
 */
export function safeValidateGenerationParams(params: unknown) {
  return GenerationParamsSchema.safeParse(params);
}

/**
 * Check if provider supports specific model
 */
export function isValidModelForProvider(provider: string, model: string): boolean {
  if (provider === 'suno') {
    return SUNO_MODELS.includes(model as any);
  }
  if (provider === 'mureka') {
    return MUREKA_MODELS.includes(model as any);
  }
  return false;
}

/**
 * Get default model for provider
 */
export function getDefaultModelForProvider(provider: string): string {
  return provider === 'suno' ? 'V5' : 'auto';
}

/**
 * Get all valid models for provider
 */
export function getValidModelsForProvider(provider: string): readonly string[] {
  return provider === 'suno' ? SUNO_MODELS : MUREKA_MODELS;
}
