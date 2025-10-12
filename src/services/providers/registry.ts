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
  mureka: {
    id: 'mureka',
    name: 'Mureka AI',
    displayName: 'Mureka O1',
    version: '1.0',
    capabilities: {
      generateMusic: true,
      extendTrack: true,
      separateStems: true,
      generateLyrics: true,
      recognizeSong: true,
      describeSong: true,
    },
    pricing: {
      costPerGeneration: 8,
      currency: 'credits',
    },
    limits: {
      maxDuration: 180,
      maxConcurrent: 3,
    },
  },
  sonauto: {
    id: 'sonauto',
    name: 'Sonauto',
    displayName: 'Sonauto AI',
    version: '2.0',
    capabilities: {
      generateMusic: true,
      extendTrack: true,
      separateStems: false,
      generateLyrics: false,
    },
    pricing: {
      costPerGeneration: 5,
      currency: 'credits',
    },
    limits: {
      maxDuration: 300,
      maxConcurrent: 10,
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
