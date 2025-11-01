/**
 * Provider Services
 * Unified export for all provider-related functionality
 */

export * from './types';
export * from './registry';
export * from './base';
export * from './factory';
export { SunoProviderAdapter } from './adapters/suno.adapter';
export { MurekaProviderAdapter } from './adapters/mureka.adapter';

/**
 * @deprecated Use ProviderFactory instead of router functions
 * Router will be removed in v3.2.0
 */
export * from './router';
