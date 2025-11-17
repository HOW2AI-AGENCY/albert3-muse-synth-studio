/**
 * Provider Factory
 * Unified factory for creating and caching provider adapters
 * 
 * @module providers/factory
 * @version 1.0.0
 * @since 2025-11-02
 */

import type { MusicProvider } from '@/config/provider-models';
import type { IProviderClient } from './base';
import { SunoProviderAdapter } from './adapters/suno.adapter';
import { logger } from '@/utils/logger';

/**
 * Factory для создания провайдер-адаптеров с кешированием
 * Использует паттерн Singleton для оптимизации производительности
 */
export class ProviderFactory {
  private static adapters = new Map<MusicProvider, IProviderClient>();

  /**
   * Получить адаптер для указанного провайдера
   * При первом вызове создаёт экземпляр, при последующих возвращает закешированный
   * 
   * @param provider - Тип провайдера ('suno' | 'mureka')
   * @returns Экземпляр адаптера провайдера
   * @throws Error если провайдер не поддерживается
   * 
   * @example
   * ```typescript
   * const provider = ProviderFactory.getProvider('suno');
   * const result = await provider.generateMusic(params);
   * ```
   */
  static getProvider(provider: MusicProvider): IProviderClient {
    logger.debug('[ProviderFactory] Getting provider adapter', provider);

    // Проверяем наличие в кеше
    if (!this.adapters.has(provider)) {
      logger.info('[ProviderFactory] Creating new adapter instance', provider);
      const adapter = this.createAdapter(provider);
      this.adapters.set(provider, adapter);
    }

    return this.adapters.get(provider)!;
  }

  /**
   * Создать новый экземпляр адаптера для провайдера
   * 
   * @private
   * @param provider - Тип провайдера
   * @returns Новый экземпляр адаптера
   * @throws Error если провайдер не поддерживается
   */
  private static createAdapter(provider: MusicProvider): IProviderClient {
    if (provider === 'suno') {
      logger.debug('[ProviderFactory] Creating Suno adapter');
      return new SunoProviderAdapter();
    }

    const errorMsg = `Unsupported provider: ${provider}`;
    logger.error('[ProviderFactory] Provider not supported', new Error(errorMsg));
    throw new Error(errorMsg);
  }

  /**
   * Очистить кеш адаптеров (используется в тестах)
   * 
   * @internal
   */
  static clearCache(): void {
    logger.debug('[ProviderFactory] Clearing adapter cache');
    this.adapters.clear();
  }

  /**
   * Получить список поддерживаемых провайдеров
   * 
   * @returns Массив идентификаторов провайдеров
   */
  static getSupportedProviders(): MusicProvider[] {
    return ['suno'];
  }

  /**
   * Проверить, поддерживается ли провайдер
   * 
   * @param provider - Идентификатор провайдера
   * @returns true если провайдер поддерживается
   */
  static isProviderSupported(provider: string): provider is MusicProvider {
    return provider === 'suno';
  }
}

/**
 * Утилита для быстрого доступа к адаптеру провайдера
 * 
 * @param provider - Тип провайдера
 * @returns Экземпляр адаптера
 * 
 * @example
 * ```typescript
 * const result = await getProviderAdapter('suno').generateMusic(params);
 * ```
 */
export function getProviderAdapter(provider: MusicProvider): IProviderClient {
  return ProviderFactory.getProvider(provider);
}
