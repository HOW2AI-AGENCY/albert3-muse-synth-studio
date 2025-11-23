/**
 * Утилиты для кэширования треков в IndexedDB
 * Обеспечивает быстрый доступ к данным треков и уменьшает количество API-запросов
 * Использует IndexedDB для обхода лимитов localStorage
 */
import { logWarn } from '@/utils/logger';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface CachedTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  image_url?: string;
  duration?: number;
  genre?: string;
  created_at: string;
  cached_at: number; // timestamp когда трек был закэширован
}

export interface TrackCacheOptions {
  maxAge?: number; // максимальный возраст кэша в миллисекундах (по умолчанию 24 часа)
  maxSize?: number; // максимальное количество треков в кэше (по умолчанию 100)
}

interface TrackDB extends DBSchema {
  tracks: {
    key: string;
    value: CachedTrack;
    indexes: { 'by-date': number };
  };
  metadata: {
    key: string;
    value: { lastUpdated: number; version: string };
  };
}

class TrackCacheManager {
  private readonly DB_NAME = 'music_tracks_db';
  private readonly STORE_NAME = 'tracks';
  private readonly METADATA_STORE_NAME = 'metadata';
  private readonly DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 часа
  private readonly DEFAULT_MAX_SIZE = 100;

  private options: Required<TrackCacheOptions>;
  private dbPromise: Promise<IDBPDatabase<TrackDB>>;

  constructor(options: TrackCacheOptions = {}) {
    this.options = {
      maxAge: options.maxAge || this.DEFAULT_MAX_AGE,
      maxSize: options.maxSize || this.DEFAULT_MAX_SIZE,
    };

    this.dbPromise = openDB<TrackDB>(this.DB_NAME, 1, {
      upgrade(db) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('by-date', 'cached_at');
        db.createObjectStore('metadata', { keyPath: 'key' });
      },
    });
  }

  /**
   * Получить трек из кэша
   */
  async getTrack(trackId: string): Promise<CachedTrack | null> {
    try {
      const db = await this.dbPromise;
      const track = await db.get(this.STORE_NAME, trackId);

      if (!track) {
        return null;
      }

      // Проверяем, не устарел ли кэш
      if (this.isExpired(track.cached_at)) {
        await this.removeTrack(trackId);
        return null;
      }

      return track;
    } catch (error) {
      logWarn('Failed to get track from cache', 'TrackCache', {
        trackId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Сохранить трек в кэш
   */
  async setTrack(track: Omit<CachedTrack, 'cached_at'>): Promise<void> {
    try {
      const db = await this.dbPromise;
      const cachedTrack: CachedTrack = {
        ...track,
        cached_at: Date.now(),
      };

      await db.put(this.STORE_NAME, cachedTrack);

      // Проверяем размер кэша и удаляем старые записи при необходимости
      await this.enforceMaxSize();
      await this.updateMetadata();
    } catch (error) {
      logWarn('Failed to save track to cache', 'TrackCache', {
        operation: 'cache',
        trackId: track.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Получить несколько треков из кэша
   */
  async getTracks(trackIds: string[]): Promise<Record<string, CachedTrack>> {
    const result: Record<string, CachedTrack> = {};
    const db = await this.dbPromise;

    for (const id of trackIds) {
      try {
        const track = await db.get(this.STORE_NAME, id);
        if (track && !this.isExpired(track.cached_at)) {
          result[id] = track;
        }
      } catch (e) {
        // ignore individual errors
      }
    }

    return result;
  }

  /**
   * Получить все актуальные треки из кэша
   */
  async getValidTracks(): Promise<CachedTrack[]> {
    try {
      const db = await this.dbPromise;
      const tracks = await db.getAllFromIndex(this.STORE_NAME, 'by-date');
      const validTracks: CachedTrack[] = [];
      let hasExpiredTracks = false;

      // tracks are sorted by date ascending (oldest first)
      // we want newest first, so we'll reverse at the end

      for (const track of tracks) {
        if (this.isExpired(track.cached_at)) {
          await db.delete(this.STORE_NAME, track.id);
          hasExpiredTracks = true;
          continue;
        }
        validTracks.push(track);
      }

      if (hasExpiredTracks) {
        await this.updateMetadata();
      }

      return validTracks.reverse();
    } catch (error) {
      logWarn('Failed to get valid tracks from cache', 'TrackCache', {
        operation: 'getValidTracks',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Сохранить несколько треков в кэш
   */
  async setTracks(tracks: Omit<CachedTrack, 'cached_at'>[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.STORE_NAME, 'readwrite');

    await Promise.all([
      ...tracks.map(track => tx.store.put({
        ...track,
        cached_at: Date.now(),
      })),
      tx.done
    ]);

    await this.enforceMaxSize();
  }

  /**
   * Удалить трек из кэша
   */
  async removeTrack(trackId: string): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.delete(this.STORE_NAME, trackId);
      await this.updateMetadata();
    } catch (error) {
      logWarn('Failed to remove track from cache', 'TrackCache', {
        operation: 'remove',
        trackId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Очистить весь кэш
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.clear(this.STORE_NAME);
      await db.clear(this.METADATA_STORE_NAME);
    } catch (error) {
      logWarn('Failed to clear cache', 'TrackCache', {
        operation: 'clearCache',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Получить статистику кэша
   */
  async getCacheStats(): Promise<{
    totalTracks: number;
    cacheSize: number; // приблизительный размер в байтах (сложно точно посчитать в IDB)
    oldestTrack?: string;
    newestTrack?: string;
  }> {
    try {
      const db = await this.dbPromise;
      const tracks = await db.getAllFromIndex(this.STORE_NAME, 'by-date');

      if (tracks.length === 0) {
        return { totalTracks: 0, cacheSize: 0 };
      }

      const oldestTrack = tracks[0];
      const newestTrack = tracks[tracks.length - 1];

      // Rough estimation
      const cacheSize = JSON.stringify(tracks).length;

      return {
        totalTracks: tracks.length,
        cacheSize,
        oldestTrack: oldestTrack.title,
        newestTrack: newestTrack.title,
      };
    } catch (error) {
      logWarn('Failed to get cache stats', 'TrackCache', {
        operation: 'getCacheStats',
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        totalTracks: 0,
        cacheSize: 0,
      };
    }
  }

  /**
   * Очистить устаревшие записи
   */
  async cleanExpiredTracks(): Promise<number> {
    try {
      const db = await this.dbPromise;
      const tracks = await db.getAll(this.STORE_NAME);
      let removedCount = 0;

      const tx = db.transaction(this.STORE_NAME, 'readwrite');

      for (const track of tracks) {
        if (this.isExpired(track.cached_at)) {
          await tx.store.delete(track.id);
          removedCount++;
        }
      }

      await tx.done;

      if (removedCount > 0) {
        await this.updateMetadata();
      }

      return removedCount;
    } catch (error) {
      logWarn('Failed to clean expired tracks', 'TrackCache', {
        operation: 'cleanExpired',
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  private isExpired(cachedAt: number): boolean {
    return Date.now() - cachedAt > this.options.maxAge;
  }

  private async enforceMaxSize(): Promise<void> {
    const db = await this.dbPromise;
    const count = await db.count(this.STORE_NAME);

    if (count <= this.options.maxSize) {
      return;
    }

    // Удаляем самые старые
    const tracksToDelete = count - this.options.maxSize;
    const keys = await db.getAllKeysFromIndex(this.STORE_NAME, 'by-date', IDBKeyRange.upperBound(Infinity), tracksToDelete);

    const tx = db.transaction(this.STORE_NAME, 'readwrite');
    await Promise.all([
      ...keys.map(key => tx.store.delete(key)),
      tx.done
    ]);
  }

  private async updateMetadata(): Promise<void> {
    try {
      const db = await this.dbPromise;
      await db.put(this.METADATA_STORE_NAME, {
        lastUpdated: Date.now(),
        version: '1.0.0',
      }, 'metadata');
    } catch (error) {
      logWarn('Failed to update cache metadata', 'TrackCache', {
        operation: 'updateMetadata',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Создаем глобальный экземпляр менеджера кэша
export const trackCache = new TrackCacheManager();

// Хук для использования кэша треков в React компонентах
export const useTrackCache = () => {
  return {
    getTrack: trackCache.getTrack.bind(trackCache),
    setTrack: trackCache.setTrack.bind(trackCache),
    getTracks: trackCache.getTracks.bind(trackCache),
    getValidTracks: trackCache.getValidTracks.bind(trackCache),
    setTracks: trackCache.setTracks.bind(trackCache),
    removeTrack: trackCache.removeTrack.bind(trackCache),
    clearCache: trackCache.clearCache.bind(trackCache),
    getCacheStats: trackCache.getCacheStats.bind(trackCache),
    cleanExpiredTracks: trackCache.cleanExpiredTracks.bind(trackCache),
  };
};

export const getCachedTracks = () => trackCache.getValidTracks();
