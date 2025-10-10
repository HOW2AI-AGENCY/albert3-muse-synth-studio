/**
 * IndexedDB-based Track Cache
 * 
 * Заменяет localStorage для хранения треков, чтобы избежать QuotaExceededError
 * Хранит треки отдельными записями и имеет жёсткий лимит по количеству
 */

import { openDB, IDBPDatabase } from 'idb';
import { logInfo, logError } from '@/utils/logger';

const DB_NAME = 'albert3_tracks_cache';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';
const MAX_TRACKS = 40; // Жёсткий лимит треков в кэше
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

export interface CachedTrack {
  id: string;
  title: string;
  artist?: string;
  audio_url: string;
  image_url?: string;
  duration?: number;
  genre?: string;
  created_at: string;
  cached_at: number; // timestamp
}

class TrackCacheIDB {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private initPromise: Promise<void> | null = null;

  private async getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('cached_at', 'cached_at');
          }
        },
      });
    }
    return this.dbPromise;
  }

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        await this.getDB();
        // Очистка устаревших записей при инициализации
        await this.cleanExpired();
        logInfo('Track cache IDB initialized', 'trackCache.idb');
      } catch (error) {
        logError('Failed to initialize track cache IDB', error as Error, 'trackCache.idb');
        throw error;
      }
    })();

    return this.initPromise;
  }

  async getTrack(id: string): Promise<CachedTrack | null> {
    try {
      const db = await this.getDB();
      const track = await db.get(STORE_NAME, id);
      
      if (!track) {
        return null;
      }

      // Проверка срока действия
      const now = Date.now();
      if (now - track.cached_at > CACHE_DURATION) {
        await this.removeTrack(id);
        return null;
      }

      return track;
    } catch (error) {
      logError('Failed to get track from cache', error as Error, 'trackCache.idb', { id });
      return null;
    }
  }

  async setTrack(track: Omit<CachedTrack, 'cached_at'>): Promise<void> {
    try {
      const db = await this.getDB();
      const cachedTrack: CachedTrack = {
        ...track,
        cached_at: Date.now(),
      };

      await db.put(STORE_NAME, cachedTrack);

      // Проверка лимита и очистка при необходимости
      await this.enforceLimit();
    } catch (error) {
      logError('Failed to set track in cache', error as Error, 'trackCache.idb', { trackId: track.id });
    }
  }

  async setTracks(tracks: Omit<CachedTrack, 'cached_at'>[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const now = Date.now();

      await Promise.all([
        ...tracks.map(track => 
          tx.store.put({
            ...track,
            cached_at: now,
          } as CachedTrack)
        ),
        tx.done,
      ]);

      // Проверка лимита после массовой записи
      await this.enforceLimit();
      
      logInfo(`Cached ${tracks.length} tracks`, 'trackCache.idb');
    } catch (error) {
      logError('Failed to set tracks in cache', error as Error, 'trackCache.idb', { count: tracks.length });
    }
  }

  async getValidTracks(): Promise<CachedTrack[]> {
    try {
      const db = await this.getDB();
      const allTracks = await db.getAll(STORE_NAME);
      const now = Date.now();

      // Фильтр только актуальных треков
      return allTracks.filter(track => now - track.cached_at <= CACHE_DURATION);
    } catch (error) {
      logError('Failed to get valid tracks', error as Error, 'trackCache.idb');
      return [];
    }
  }

  async removeTrack(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(STORE_NAME, id);
    } catch (error) {
      logError('Failed to remove track from cache', error as Error, 'trackCache.idb', { id });
    }
  }

  async clearCache(): Promise<void> {
    try {
      const db = await this.getDB();
      await db.clear(STORE_NAME);
      logInfo('Cache cleared', 'trackCache.idb');
    } catch (error) {
      logError('Failed to clear cache', error as Error, 'trackCache.idb');
    }
  }

  async getCacheStats(): Promise<{ count: number; oldestTimestamp: number | null; newestTimestamp: number | null }> {
    try {
      const db = await this.getDB();
      const allTracks = await db.getAll(STORE_NAME);

      if (allTracks.length === 0) {
        return { count: 0, oldestTimestamp: null, newestTimestamp: null };
      }

      const timestamps = allTracks.map(t => t.cached_at);
      return {
        count: allTracks.length,
        oldestTimestamp: Math.min(...timestamps),
        newestTimestamp: Math.max(...timestamps),
      };
    } catch (error) {
      logError('Failed to get cache stats', error as Error, 'trackCache.idb');
      return { count: 0, oldestTimestamp: null, newestTimestamp: null };
    }
  }

  /**
   * Удаляет самые старые записи, если превышен лимит
   */
  private async enforceLimit(): Promise<void> {
    try {
      const db = await this.getDB();
      const allTracks = await db.getAllFromIndex(STORE_NAME, 'cached_at');

      if (allTracks.length <= MAX_TRACKS) {
        return;
      }

      // Удаляем самые старые треки
      const toRemove = allTracks.length - MAX_TRACKS;
      const tracksToRemove = allTracks.slice(0, toRemove);

      const tx = db.transaction(STORE_NAME, 'readwrite');
      await Promise.all([
        ...tracksToRemove.map(track => tx.store.delete(track.id)),
        tx.done,
      ]);

      logInfo(`Removed ${toRemove} old tracks to enforce limit`, 'trackCache.idb', {
        limit: MAX_TRACKS,
        removed: toRemove,
      });
    } catch (error) {
      logError('Failed to enforce cache limit', error as Error, 'trackCache.idb');
    }
  }

  /**
   * Удаляет устаревшие записи
   */
  private async cleanExpired(): Promise<void> {
    try {
      const db = await this.getDB();
      const allTracks = await db.getAll(STORE_NAME);
      const now = Date.now();
      const expired = allTracks.filter(track => now - track.cached_at > CACHE_DURATION);

      if (expired.length === 0) {
        return;
      }

      const tx = db.transaction(STORE_NAME, 'readwrite');
      await Promise.all([
        ...expired.map(track => tx.store.delete(track.id)),
        tx.done,
      ]);

      logInfo(`Cleaned ${expired.length} expired tracks`, 'trackCache.idb');
    } catch (error) {
      logError('Failed to clean expired tracks', error as Error, 'trackCache.idb');
    }
  }
}

// Singleton instance
export const trackCacheIDB = new TrackCacheIDB();

// Auto-initialize on import
trackCacheIDB.init().catch(err => {
  logError('Failed to auto-initialize track cache', err as Error, 'trackCache.idb');
});
