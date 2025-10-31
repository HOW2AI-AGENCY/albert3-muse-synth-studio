/**
 * Unified Model Validator
 * Single source of truth for valid AI model versions across providers
 * Prevents API errors due to invalid model specifications
 */

import { logger } from "./logger.ts";

/**
 * Valid models for each provider
 * ✅ Must match provider-models.ts on frontend
 */
const VALID_MODELS = {
  suno: ['V5', 'V4_5PLUS', 'V4_5', 'V4', 'V3_5'] as const,
  mureka: ['auto', 'mureka-6', 'mureka-7.5', 'mureka-o1'] as const,
} as const;

type SunoModel = typeof VALID_MODELS.suno[number];
type MurekaModel = typeof VALID_MODELS.mureka[number];

/**
 * Default models for each provider
 */
const DEFAULT_MODELS = {
  suno: 'V5' as SunoModel,
  mureka: 'auto' as MurekaModel,
} as const;

export type MusicProvider = 'suno' | 'mureka';

/**
 * Validate model version for a specific provider
 * Returns validated model or default if invalid
 * 
 * @param provider - Music generation provider
 * @param modelVersion - Requested model version
 * @returns Validated model version (never undefined)
 * 
 * @example
 * ```typescript
 * const model = validateModelVersion('suno', 'chirp-v3-5'); // Returns 'V5' (default)
 * const model = validateModelVersion('suno', 'V4_5PLUS');   // Returns 'V4_5PLUS'
 * ```
 */
export function validateModelVersion(
  provider: MusicProvider,
  modelVersion?: string
): string {
  const validModels = VALID_MODELS[provider];
  const defaultModel = DEFAULT_MODELS[provider];
  
  // No model specified - use default
  if (!modelVersion) {
    logger.info('No model specified, using default', {
      provider,
      defaultModel,
    });
    return defaultModel;
  }
  
  // Check if model is valid
  const isValid = (validModels as readonly string[]).includes(modelVersion);
  if (!isValid) {
    logger.warn('Invalid model version, using default', {
      provider,
      requestedModel: modelVersion,
      validModels: validModels.join(', '),
      defaultModel,
    });
    return defaultModel;
  }
  
  // Model is valid
  return modelVersion;
}

/**
 * Get list of valid models for a provider
 * Useful for logging and validation
 */
export function getValidModels(provider: MusicProvider): readonly string[] {
  return VALID_MODELS[provider];
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: MusicProvider): string {
  return DEFAULT_MODELS[provider];
}

/**
 * Check if a model is valid for a provider (boolean check)
 */
export function isValidModel(provider: MusicProvider, modelVersion: string): boolean {
  return (VALID_MODELS[provider] as readonly string[]).includes(modelVersion);
}
