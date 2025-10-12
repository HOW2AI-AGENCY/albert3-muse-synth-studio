/**
 * Provider Router
 * Routes requests to appropriate provider adapters
 */

import { MusicProvider } from './types';
import { IProviderClient } from './base';
import { SunoProviderAdapter } from './adapters/suno.adapter';
import { MurekaProviderAdapter } from './adapters/mureka.adapter';
import { isCapabilitySupported, getProviderConfig } from './registry';
import { logger } from '@/utils/logger';

const adapters: Record<MusicProvider, IProviderClient> = {
  suno: new SunoProviderAdapter(),
  mureka: new MurekaProviderAdapter(),
  sonauto: new SunoProviderAdapter(), // Placeholder until Sonauto is implemented
};

export function getProviderAdapter(provider: MusicProvider): IProviderClient {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`No adapter found for provider: ${provider}`);
  }
  return adapter;
}

export class ProviderRouter {
  static async route(
    provider: MusicProvider,
    action: 'generate' | 'extend' | 'stems' | 'balance',
    payload: any
  ): Promise<any> {
    logger.info('Routing request', undefined, { provider, action });

    const adapter = getProviderAdapter(provider);
    const config = getProviderConfig(provider);

    switch (action) {
      case 'generate':
        if (!isCapabilitySupported(provider, 'generateMusic')) {
          throw new Error(`${config.displayName} не поддерживает генерацию музыки`);
        }
        return adapter.generateMusic(payload);

      case 'extend':
        if (!isCapabilitySupported(provider, 'extendTrack')) {
          throw new Error(`${config.displayName} не поддерживает расширение треков`);
        }
        return adapter.extendTrack(payload);

      case 'stems':
        if (!isCapabilitySupported(provider, 'separateStems')) {
          throw new Error(`${config.displayName} не поддерживает разделение стемов`);
        }
        if (!adapter.separateStems) {
          throw new Error(`Adapter for ${provider} does not implement separateStems`);
        }
        return adapter.separateStems(payload);

      case 'balance':
        return adapter.getBalance();

      default:
        throw new Error(`Неизвестное действие: ${action}`);
    }
  }
}
