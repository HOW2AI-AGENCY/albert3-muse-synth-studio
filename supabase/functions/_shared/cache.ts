import { logger } from "./logger.ts";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLSeconds: number = 3600) {
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug('Cache entry expired', { key });
      return null;
    }

    logger.debug('Cache hit', { key });
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds || this.defaultTTL / 1000) * 1000;
    const expiresAt = Date.now() + ttl;

    this.cache.set(key, { value, expiresAt });
    logger.debug('Cache set', { key, ttlSeconds: ttl / 1000 });
  }

  delete(key: string): void {
    this.cache.delete(key);
    logger.debug('Cache entry deleted', { key });
  }

  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup completed', { entriesRemoved: cleaned });
    }
  }

  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instances
export const promptCache = new MemoryCache<string>(3600); // 1 hour
export const styleCache = new MemoryCache<string[]>(3600); // 1 hour
export const balanceCache = new MemoryCache<unknown>(300); // 5 minutes for balance data

// Cleanup expired entries every 5 minutes
setInterval(() => {
  promptCache.cleanup();
  styleCache.cleanup();
  balanceCache.cleanup();
}, 5 * 60 * 1000);

/**
 * Create Cache-Control headers for HTTP responses
 * Implements stale-while-revalidate pattern
 */
export const createCacheHeaders = (options: {
  maxAge?: number;
  staleWhileRevalidate?: number;
  public?: boolean;
} = {}) => {
  const {
    maxAge = 60, // 1 minute default
    staleWhileRevalidate = 300, // 5 minutes default
    public: isPublic = false,
  } = options;

  const directives = [
    isPublic ? 'public' : 'private',
    `max-age=${maxAge}`,
    `stale-while-revalidate=${staleWhileRevalidate}`,
  ];

  return {
    'Cache-Control': directives.join(', '),
    'CDN-Cache-Control': `max-age=${maxAge}`,
  };
};
