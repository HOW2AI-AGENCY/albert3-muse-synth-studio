/**
 * Cache Manager Utility Tests
 * Week 1, Phase 1.2 - Core Utilities Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '@/utils/cache';

describe('CacheManager Utility', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager<string>(1000); // 1 second TTL
  });

  describe('Basic operations', () => {
    it('should set and get cached value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should handle multiple keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should clear all cached values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire cached value after TTL', async () => {
      const shortCache = new CacheManager<string>(100); // 100ms TTL
      shortCache.set('key1', 'value1');

      expect(shortCache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(shortCache.get('key1')).toBeNull();
    });

    it('should not expire before TTL', async () => {
      const longCache = new CacheManager<string>(5000); // 5s TTL
      longCache.set('key1', 'value1');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(longCache.get('key1')).toBe('value1');
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when maxSize is reached', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');

      // Evict oldest 2 entries (maxSize = 3)
      cache.evictOldest(3);

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
      expect(cache.get('key5')).toBe('value5');
    });

    it('should not evict if size is within maxSize', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.evictOldest(5);

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });

    it('should handle eviction with exact maxSize', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.evictOldest(3);

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });
  });

  describe('Type safety', () => {
    it('should work with number type', () => {
      const numberCache = new CacheManager<number>();
      numberCache.set('count', 42);
      expect(numberCache.get('count')).toBe(42);
    });

    it('should work with object type', () => {
      interface User {
        id: string;
        name: string;
      }

      const objectCache = new CacheManager<User>();
      const user = { id: '123', name: 'Test User' };
      objectCache.set('user1', user);

      expect(objectCache.get('user1')).toEqual(user);
    });

    it('should work with array type', () => {
      const arrayCache = new CacheManager<string[]>();
      const tags = ['tag1', 'tag2', 'tag3'];
      arrayCache.set('tags', tags);

      expect(arrayCache.get('tags')).toEqual(tags);
    });
  });
});
