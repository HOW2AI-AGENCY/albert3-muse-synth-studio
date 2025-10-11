/**
 * Утилиты для кэширования треков в localStorage
 * Обеспечивает быстрый доступ к данным треков и уменьшает количество API-запросов
 */

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

class TrackCacheManager {
  private readonly CACHE_KEY = 'music_tracks_cache';
  private readonly CACHE_METADATA_KEY = 'music_tracks_cache_metadata';
  private readonly DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 часа
  private readonly DEFAULT_MAX_SIZE = 100;

  private options: Required<TrackCacheOptions>;

  constructor(options: TrackCacheOptions = {}) {
    this.options = {
      maxAge: options.maxAge || this.DEFAULT_MAX_AGE,
      maxSize: options.maxSize || this.DEFAULT_MAX_SIZE,
    };
  }

  /**
   * Получить трек из кэша
   */
  getTrack(trackId: string): CachedTrack | null {
    try {
      const cache = this.getCache();
      const track = cache[trackId];

      if (!track) {
        return null;
      }

      // Проверяем, не устарел ли кэш
      if (this.isExpired(track.cached_at)) {
        this.removeTrack(trackId);
        return null;
      }

      return track;
    } catch (error) {
      import('@/utils/logger').then(({ logWarn }) => {
        logWarn('Failed to get track from cache', 'TrackCache', {
          trackId,
          error: error instanceof Error ? error.message : String(error)
        });
      });
      return null;
    }
  }

  /**
   * Сохранить трек в кэш
   */
  setTrack(track: Omit<CachedTrack, 'cached_at'>): void {
    try {
      const cache = this.getCache();
      const cachedTrack: CachedTrack = {
        ...track,
        cached_at: Date.now(),
      };

      cache[track.id] = cachedTrack;

      // Проверяем размер кэша и удаляем старые записи при необходимости
      this.enforceMaxSize(cache);

      this.saveCache(cache);
      this.updateMetadata();
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
        import('@/utils/logger').then(({ logWarn }) => {
          logWarn('Storage quota exceeded, clearing cache', 'TrackCache', {
            operation: 'cache',
            trackId: track.id,
            quotaExceeded: true
          });
        });
        this.cleanExpiredTracks();
        // If still failing, reduce cache size by 50%
        const cache = this.getCache();
        const entries = Object.entries(cache).sort((a, b) => a[1].cached_at - b[1].cached_at);
        const half = Math.floor(entries.length / 2);
        const reducedCache = Object.fromEntries(entries.slice(half));
        try {
          localStorage.setItem(this.CACHE_KEY, JSON.stringify(reducedCache));
          // Retry with reduced cache
          const newCache = this.getCache();
          newCache[track.id] = { ...track, cached_at: Date.now() };
          localStorage.setItem(this.CACHE_KEY, JSON.stringify(newCache));
        } catch (retryError) {
          import('@/utils/logger').then(({ logError }) => {
            logError('Cache failed after cleanup', retryError as Error, 'TrackCache', {
              operation: 'cache',
              trackId: track.id,
              retriesExhausted: true
            });
          });
        }
      } else {
        import('@/utils/logger').then(({ logWarn }) => {
          logWarn('Failed to save track to cache', 'TrackCache', {
            operation: 'cache',
            trackId: track.id,
            error: error instanceof Error ? error.message : String(error)
          });
        });
      }
    }
  }

  /**
   * Получить несколько треков из кэша
   */
  getTracks(trackIds: string[]): Record<string, CachedTrack> {
    const result: Record<string, CachedTrack> = {};

    for (const id of trackIds) {
      const track = this.getTrack(id);
      if (track) {
        result[id] = track;
      }
    }

    return result;
  }

  /**
   * Получить все актуальные треки из кэша
   */
  getValidTracks(): CachedTrack[] {
    try {
      const cache = this.getCache();
      const validTracks: CachedTrack[] = [];
      let hasExpiredTracks = false;

      for (const [trackId, track] of Object.entries(cache)) {
        if (this.isExpired(track.cached_at)) {
          delete cache[trackId];
          hasExpiredTracks = true;
          continue;
        }

        validTracks.push(track);
      }

      if (hasExpiredTracks) {
        this.saveCache(cache);
        this.updateMetadata();
      }

      return validTracks.sort((a, b) => b.cached_at - a.cached_at);
    } catch (error) {
      import('@/utils/logger').then(({ logWarn }) => {
        logWarn('Failed to get valid tracks from cache', 'TrackCache', {
          operation: 'getValidTracks',
          error: error instanceof Error ? error.message : String(error)
        });
      });
      return [];
    }
  }

  /**
   * Сохранить несколько треков в кэш
   */
  setTracks(tracks: Omit<CachedTrack, 'cached_at'>[]): void {
    for (const track of tracks) {
      this.setTrack(track);
    }
  }

  /**
   * Удалить трек из кэша
   */
  removeTrack(trackId: string): void {
    try {
      const cache = this.getCache();
      delete cache[trackId];
      this.saveCache(cache);
      this.updateMetadata();
    } catch (error) {
      import('@/utils/logger').then(({ logWarn }) => {
        logWarn('Failed to remove track from cache', 'TrackCache', {
          operation: 'remove',
          trackId,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }
  }

  /**
   * Очистить весь кэш
   */
  clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_METADATA_KEY);
    } catch (error) {
      import('@/utils/logger').then(({ logWarn }) => {
        logWarn('Failed to clear cache', 'TrackCache', {
          operation: 'clearCache',
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }
  }

  /**
   * Получить статистику кэша
   */
  getCacheStats(): {
    totalTracks: number;
    cacheSize: number; // размер в байтах
    oldestTrack?: string;
    newestTrack?: string;
  } {
    try {
      const cache = this.getCache();
      const tracks = Object.values(cache);
      const cacheString = JSON.stringify(cache);

      let oldestTrack: string | undefined;
      let newestTrack: string | undefined;
      let oldestTime = Infinity;
      let newestTime = 0;

      for (const track of tracks) {
        if (track.cached_at < oldestTime) {
          oldestTime = track.cached_at;
          oldestTrack = track.title;
        }
        if (track.cached_at > newestTime) {
          newestTime = track.cached_at;
          newestTrack = track.title;
        }
      }

      return {
        totalTracks: tracks.length,
        cacheSize: new Blob([cacheString]).size,
        oldestTrack,
        newestTrack,
      };
    } catch (error) {
      import('@/utils/logger').then(({ logWarn }) => {
        logWarn('Failed to get cache stats', 'TrackCache', {
          operation: 'getCacheStats',
          error: error instanceof Error ? error.message : String(error)
        });
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
  cleanExpiredTracks(): number {
    try {
      const cache = this.getCache();
      // const initialCount = Object.keys(cache).length;
      let removedCount = 0;

      for (const [trackId, track] of Object.entries(cache)) {
        if (this.isExpired(track.cached_at)) {
          delete cache[trackId];
          removedCount++;
        }
      }

      if (removedCount > 0) {
        this.saveCache(cache);
        this.updateMetadata();
      }

      return removedCount;
    } catch (error) {
      import('@/utils/logger').then(({ logWarn }) => {
        logWarn('Failed to clean expired tracks', 'TrackCache', {
          operation: 'cleanExpired',
          error: error instanceof Error ? error.message : String(error)
        });
      });
      return 0;
    }
  }

  private getCache(): Record<string, CachedTrack> {
    try {
      const cacheString = localStorage.getItem(this.CACHE_KEY);
      return cacheString ? JSON.parse(cacheString) : {};
    } catch (error) {
      import('@/utils/logger').then(({ logWarn }) => {
        logWarn('Failed to read cache, creating new', 'TrackCache', {
          operation: 'getCache',
          error: error instanceof Error ? error.message : String(error)
        });
      });
      return {};
    }
  }

  private saveCache(cache: Record<string, CachedTrack>): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  private isExpired(cachedAt: number): boolean {
    return Date.now() - cachedAt > this.options.maxAge;
  }

  private enforceMaxSize(cache: Record<string, CachedTrack>): void {
    const tracks = Object.values(cache);
    if (tracks.length <= this.options.maxSize) {
      return;
    }

    // Сортируем по времени кэширования (старые первыми)
    tracks.sort((a, b) => a.cached_at - b.cached_at);

    // Удаляем старые треки
    const tracksToRemove = tracks.slice(0, tracks.length - this.options.maxSize);
    for (const track of tracksToRemove) {
      delete cache[track.id];
    }
  }

  private updateMetadata(): void {
    try {
      const metadata = {
        lastUpdated: Date.now(),
        version: '1.0.0',
      };
      localStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      import('@/utils/logger').then(({ logWarn }) => {
        logWarn('Failed to update cache metadata', 'TrackCache', {
          operation: 'updateMetadata',
          error: error instanceof Error ? error.message : String(error)
        });
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