/**
 * Provider Registry
 * Configuration for all supported music generation providers
 */

import { MusicProvider, ProviderConfig } from './types';

export const PROVIDERS: Record<MusicProvider, ProviderConfig> = {
  suno: {
    id: 'suno',
    name: 'Suno AI',
    displayName: 'Suno AI v5',
    version: '5.0',
    capabilities: {
      generateMusic: true,
      extendTrack: true,
      separateStems: true,
      generateLyrics: true,
      createCover: true,
    },
    pricing: {
      costPerGeneration: 10,
      currency: 'credits',
    },
    limits: {
      maxDuration: 240,
      maxConcurrent: 5,
    },
  },
};

export function getProviderConfig(provider: MusicProvider): ProviderConfig {
  return PROVIDERS[provider];
}

export function getProviderCapabilities(provider: MusicProvider) {
  return PROVIDERS[provider].capabilities;
}

export function isCapabilitySupported(
  provider: MusicProvider,
  capability: keyof ProviderConfig['capabilities']
): boolean {
  return PROVIDERS[provider].capabilities[capability] === true;
}
