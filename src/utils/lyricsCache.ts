/**
 * Lyrics Cache Manager
 * Manages in-memory cache for timestamped lyrics with LRU eviction
 */

interface CachedLyrics {
  data: any;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
}

class LyricsCacheManager {
  private cache = new Map<string, CachedLyrics>();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 50, ttl: number = 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Generate cache key from task ID and audio ID
   */
  private getCacheKey(taskId: string, audioId: string): string {
    return `${taskId}:${audioId}`;
  }

  /**
   * Get cached lyrics data
   */
  get(taskId: string, audioId: string): any | null {
    const key = this.getCacheKey(taskId, audioId);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    const age = Date.now() - cached.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    cached.accessCount++;
    cached.lastAccess = Date.now();

    return cached.data;
  }

  /**
   * Set cached lyrics data
   */
  set(taskId: string, audioId: string, data: any): void {
    const key = this.getCacheKey(taskId, audioId);

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
    });
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, cached] of this.cache.entries()) {
      if (cached.lastAccess < oldestAccess) {
        oldestAccess = cached.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalAccessCount: entries.reduce((sum, e) => sum + e.accessCount, 0),
      averageAge: entries.length > 0
        ? entries.reduce((sum, e) => sum + (now - e.timestamp), 0) / entries.length
        : 0,
      hitRate: entries.length > 0
        ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length
        : 0,
    };
  }

  /**
   * Remove expired entries (garbage collection)
   */
  gc(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, cached] of this.cache.entries()) {
      const age = now - cached.timestamp;
      if (age > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Export singleton instance
export const lyricsCache = new LyricsCacheManager();

// Optional: Run garbage collection every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const removed = lyricsCache.gc();
    if (removed > 0) {
      console.log(`[LyricsCache] Garbage collected ${removed} expired entries`);
    }
  }, 5 * 60 * 1000);
}
