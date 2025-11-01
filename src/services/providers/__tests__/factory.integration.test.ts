/**
 * ProviderFactory Integration Tests
 * Tests the integration between Factory, Adapters and actual provider APIs
 * 
 * @module services/providers/__tests__/factory.integration.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderFactory } from '../factory';

describe('ProviderFactory Integration Tests', () => {
  beforeEach(() => {
    // Очистить кеш перед каждым тестом
    ProviderFactory.clearCache();
  });

  describe('Provider Creation', () => {
    it('should create Suno provider with correct capabilities', () => {
      const provider = ProviderFactory.getProvider('suno');
      
      expect(provider).toBeDefined();
      expect(provider.generateMusic).toBeDefined();
      expect(provider.extendTrack).toBeDefined();
      expect(provider.separateStems).toBeDefined();
      expect(provider.getBalance).toBeDefined();
    });

    it('should create Mureka provider with correct capabilities', () => {
      const provider = ProviderFactory.getProvider('mureka');
      
      expect(provider).toBeDefined();
      expect(provider.generateMusic).toBeDefined();
      expect(provider.separateStems).toBeDefined();
      expect(provider.getBalance).toBeDefined();
    });

    it('should cache providers correctly', () => {
      const provider1 = ProviderFactory.getProvider('suno');
      const provider2 = ProviderFactory.getProvider('suno');
      
      // Должны быть одним и тем же экземпляром (singleton)
      expect(provider1).toBe(provider2);
    });

    it('should create separate instances for different providers', () => {
      const sunoProvider = ProviderFactory.getProvider('suno');
      const murekaProvider = ProviderFactory.getProvider('mureka');
      
      expect(sunoProvider).not.toBe(murekaProvider);
    });
  });

  describe('Provider Switching', () => {
    it('should allow switching between providers', () => {
      const provider1 = ProviderFactory.getProvider('suno');
      expect(provider1).toBeDefined();
      
      const provider2 = ProviderFactory.getProvider('mureka');
      expect(provider2).toBeDefined();
      
      // Вернуться к Suno - должен вернуть закешированный экземпляр
      const provider3 = ProviderFactory.getProvider('suno');
      expect(provider3).toBe(provider1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported provider', () => {
      expect(() => {
        // @ts-expect-error Testing invalid provider
        ProviderFactory.getProvider('replicate');
      }).toThrow('Unsupported provider: replicate');
    });

    it('should handle empty provider string', () => {
      expect(() => {
        // @ts-expect-error Testing invalid provider
        ProviderFactory.getProvider('');
      }).toThrow('Unsupported provider:');
    });
  });

  describe('Provider Capabilities', () => {
    it('should verify Suno supports all expected methods', () => {
      const provider = ProviderFactory.getProvider('suno');
      
      const requiredMethods = [
        'generateMusic',
        'extendTrack',
        'separateStems',
        'getBalance'
      ];
      
      requiredMethods.forEach(method => {
        expect(provider).toHaveProperty(method);
        expect(typeof (provider as any)[method]).toBe('function');
      });
    });

    it('should verify Mureka supports all expected methods', () => {
      const provider = ProviderFactory.getProvider('mureka');
      
      const requiredMethods = [
        'generateMusic',
        'separateStems',
        'getBalance'
      ];
      
      requiredMethods.forEach(method => {
        expect(provider).toHaveProperty(method);
        expect(typeof (provider as any)[method]).toBe('function');
      });
    });
  });

  describe('getSupportedProviders', () => {
    it('should return all supported providers', () => {
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
      expect(ProviderFactory.isProviderSupported('replicate')).toBe(false);
      expect(ProviderFactory.isProviderSupported('openai')).toBe(false);
      expect(ProviderFactory.isProviderSupported('')).toBe(false);
      expect(ProviderFactory.isProviderSupported('SUNO')).toBe(false); // Case sensitive
    });
  });

  describe('clearCache', () => {
    it('should clear cached providers', () => {
      const provider1 = ProviderFactory.getProvider('suno');
      
      ProviderFactory.clearCache();
      
      const provider2 = ProviderFactory.getProvider('suno');
      
      // После очистки кеша должен быть новый экземпляр
      expect(provider1).not.toBe(provider2);
    });

    it('should handle multiple clearCache calls', () => {
      ProviderFactory.clearCache();
      ProviderFactory.clearCache();
      ProviderFactory.clearCache();
      
      // Не должно быть ошибок
      const provider = ProviderFactory.getProvider('suno');
      expect(provider).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should not create memory leaks with repeated provider access', () => {
      // Создать провайдеров много раз
      for (let i = 0; i < 100; i++) {
        ProviderFactory.getProvider('suno');
        ProviderFactory.getProvider('mureka');
      }
      
      // Должен быть только 1 экземпляр каждого провайдера в кеше
      const provider1 = ProviderFactory.getProvider('suno');
      const provider2 = ProviderFactory.getProvider('suno');
      
      expect(provider1).toBe(provider2);
    });
  });
});
