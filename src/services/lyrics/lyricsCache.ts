/**
 * IndexedDB-based lyrics caching system
 * Provides instant synchronized lyrics display on repeated playback
 * 
 * Features:
 * - Persistent storage across sessions
 * - Automatic cache cleanup
 * - Prefetching for queue optimization
 * 
 * @version 1.0.0
 * @created 2025-11-12
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { logger } from '@/utils/logger';

interface TimestampedLyricsData {
  alignedWords: Array<{
    word: string;
    success: boolean;
    startS: number;
    endS: number;
    palign: number;
  }>;
  waveformData: number[];
  hootCer: number;
  isStreamed: boolean;
}

interface CachedLyrics {
  taskId: string;
  audioId: string;
  data: TimestampedLyricsData;
  cachedAt: number; // timestamp
  accessCount: number;
  lastAccessedAt: number;
}

interface LyricsCacheDB extends DBSchema {
  lyrics: {
    key: string; // taskId-audioId
    value: CachedLyrics;
    indexes: {
      'by-cachedAt': number;
      'by-accessCount': number;
    };
  };
}

const DB_NAME = 'albert3-lyrics-cache';
const DB_VERSION = 1;
const STORE_NAME = 'lyrics';
const MAX_CACHE_SIZE = 100; // Max cached tracks
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

class LyricsCacheService {
  private db: IDBPDatabase<LyricsCacheDB> | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<void> {
    if (this.db) return;
    
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        this.db = await openDB<LyricsCacheDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const store = db.createObjectStore(STORE_NAME, { keyPath: 'taskId' });
              store.createIndex('by-cachedAt', 'cachedAt');
              store.createIndex('by-accessCount', 'accessCount');
            }
          },
        });
        logger.info('Lyrics cache initialized', 'LyricsCacheService');
      } catch (error) {
        logger.error('Failed to initialize lyrics cache', error as Error, 'LyricsCacheService');
        throw error;
      }
    })();

    await this.initPromise;
  }

  /**
   * Generate cache key from taskId and audioId
   */
  private getCacheKey(taskId: string, audioId: string): string {
    return `${taskId}-${audioId}`;
  }

  /**
   * Get cached lyrics
   */
  async get(taskId: string, audioId: string): Promise<TimestampedLyricsData | null> {
    await this.init();
    if (!this.db) return null;

    try {
      const key = this.getCacheKey(taskId, audioId);
      const cached = await this.db.get(STORE_NAME, key);

      if (!cached) {
        logger.debug('Cache miss', 'LyricsCacheService', { taskId, audioId });
        return null;
      }

      // Check if expired
      const age = Date.now() - cached.cachedAt;
      if (age > CACHE_TTL) {
        logger.info('Cache expired, removing', 'LyricsCacheService', { taskId, audioId, age });
        await this.db.delete(STORE_NAME, key);
        return null;
      }

      // Update access stats
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      await tx.store.put({
        ...cached,
        accessCount: cached.accessCount + 1,
        lastAccessedAt: Date.now(),
      });
      await tx.done;

      logger.info('Cache hit', 'LyricsCacheService', { 
        taskId, 
        audioId, 
        accessCount: cached.accessCount + 1 
      });

      return cached.data;
    } catch (error) {
      logger.error('Failed to get from cache', error as Error, 'LyricsCacheService', {
        taskId,
        audioId,
      });
      return null;
    }
  }

  /**
   * Save lyrics to cache
   */
  async set(taskId: string, audioId: string, data: TimestampedLyricsData): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      const key = this.getCacheKey(taskId, audioId);
      const cached: CachedLyrics = {
        taskId: key,
        audioId,
        data,
        cachedAt: Date.now(),
        accessCount: 1,
        lastAccessedAt: Date.now(),
      };

      await this.db.put(STORE_NAME, cached);

      logger.info('Lyrics cached', 'LyricsCacheService', { taskId, audioId });

      // Cleanup old entries if cache is full
      await this.cleanup();
    } catch (error) {
      logger.error('Failed to save to cache', error as Error, 'LyricsCacheService', {
        taskId,
        audioId,
      });
    }
  }

  /**
   * Cleanup old/unused cache entries
   */
  private async cleanup(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const count = await store.count();

      if (count <= MAX_CACHE_SIZE) {
        return;
      }

      // Get all entries sorted by access count and age
      const all = await store.getAll();
      
      // Sort by: least accessed, oldest first
      all.sort((a, b) => {
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        return a.cachedAt - b.cachedAt;
      });

      // Remove oldest 20% entries
      const toRemove = Math.ceil(count * 0.2);
      for (let i = 0; i < toRemove; i++) {
        await store.delete(all[i].taskId);
      }

      await tx.done;

      logger.info('Cache cleanup completed', 'LyricsCacheService', {
        totalBefore: count,
        removed: toRemove,
        totalAfter: count - toRemove,
      });
    } catch (error) {
      logger.error('Cache cleanup failed', error as Error, 'LyricsCacheService');
    }
  }

  /**
   * Clear all cached lyrics
   */
  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      await this.db.clear(STORE_NAME);
      logger.info('Cache cleared', 'LyricsCacheService');
    } catch (error) {
      logger.error('Failed to clear cache', error as Error, 'LyricsCacheService');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    await this.init();
    if (!this.db) {
      return { totalEntries: 0, totalSize: 0, oldestEntry: null, newestEntry: null };
    }

    try {
      const all = await this.db.getAll(STORE_NAME);
      const totalEntries = all.length;
      const totalSize = JSON.stringify(all).length;
      const oldestEntry = all.length > 0 ? Math.min(...all.map(e => e.cachedAt)) : null;
      const newestEntry = all.length > 0 ? Math.max(...all.map(e => e.cachedAt)) : null;

      return { totalEntries, totalSize, oldestEntry, newestEntry };
    } catch (error) {
      logger.error('Failed to get cache stats', error as Error, 'LyricsCacheService');
      return { totalEntries: 0, totalSize: 0, oldestEntry: null, newestEntry: null };
    }
  }
}

export const lyricsCache = new LyricsCacheService();
