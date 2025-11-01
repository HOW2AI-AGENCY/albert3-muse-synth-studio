/**
 * Provider Factory Unit Tests
 * 
 * @module providers/__tests__/factory.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderFactory, getProviderAdapter } from '../factory';
import { SunoProviderAdapter } from '../adapters/suno.adapter';
import { MurekaProviderAdapter } from '../adapters/mureka.adapter';

describe('ProviderFactory', () => {
  beforeEach(() => {
    // Очистить кеш перед каждым тестом
    ProviderFactory.clearCache();
  });

  describe('getProvider', () => {
    it('should return SunoProviderAdapter for "suno" provider', () => {
      const provider = ProviderFactory.getProvider('suno');
      expect(provider).toBeInstanceOf(SunoProviderAdapter);
    });

    it('should return MurekaProviderAdapter for "mureka" provider', () => {
      const provider = ProviderFactory.getProvider('mureka');
      expect(provider).toBeInstanceOf(MurekaProviderAdapter);
    });

    it('should cache provider instances (singleton pattern)', () => {
      const provider1 = ProviderFactory.getProvider('suno');
      const provider2 = ProviderFactory.getProvider('suno');
      
      // Должны быть одним и тем же экземпляром
      expect(provider1).toBe(provider2);
    });

    it('should create separate instances for different providers', () => {
      const sunoProvider = ProviderFactory.getProvider('suno');
      const murekaProvider = ProviderFactory.getProvider('mureka');
      
      expect(sunoProvider).not.toBe(murekaProvider);
      expect(sunoProvider).toBeInstanceOf(SunoProviderAdapter);
      expect(murekaProvider).toBeInstanceOf(MurekaProviderAdapter);
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        // @ts-expect-error Testing invalid provider
        ProviderFactory.getProvider('invalid');
      }).toThrow('Unsupported provider: invalid');
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = ProviderFactory.getSupportedProviders();
      
      expect(providers).toEqual(['suno', 'mureka']);
      expect(providers).toHaveLength(2);
    });
  });

  describe('isProviderSupported', () => {
    it('should return true for supported providers', () => {
      expect(ProviderFactory.isProviderSupported('suno')).toBe(true);
      expect(ProviderFactory.isProviderSupported('mureka')).toBe(true);
    });

    it('should return false for unsupported providers', () => {
      expect(ProviderFactory.isProviderSupported('invalid')).toBe(false);
      expect(ProviderFactory.isProviderSupported('replicate')).toBe(false);
      expect(ProviderFactory.isProviderSupported('')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cached adapters', () => {
      // Создать экземпляр
      const provider1 = ProviderFactory.getProvider('suno');
      
      // Очистить кеш
      ProviderFactory.clearCache();
      
      // Получить новый экземпляр
      const provider2 = ProviderFactory.getProvider('suno');
      
      // Должны быть разными экземплярами
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('getProviderAdapter helper', () => {
    it('should work as shortcut to ProviderFactory.getProvider', () => {
      const provider1 = getProviderAdapter('suno');
      const provider2 = ProviderFactory.getProvider('suno');
      
      expect(provider1).toBe(provider2);
    });
  });
});
