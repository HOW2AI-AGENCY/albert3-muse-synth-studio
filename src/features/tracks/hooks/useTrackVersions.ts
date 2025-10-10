/**
 * useTrackVersions Hook
 * 
 * Кастомный хук для работы с версиями треков
 * Упрощает загрузку и управление версиями треков из БД
 * 
 * Использование:
 * ```tsx
 * const {
 *   versions,
 *   allVersions,
 *   isLoading,
 *   versionCount,
 *   loadVersions
 * } = useTrackVersions(trackId);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getTrackWithVersions,
  TrackWithVersions,
  getMasterVersion,
} from '../api/trackVersions';
import { logInfo, logError } from '@/utils/logger';

type VersionsListener = (versions: TrackWithVersions[]) => void;

const versionsCache = new Map<string, TrackWithVersions[]>();
const listeners = new Map<string, Set<VersionsListener>>();
const inFlightRequests = new Map<string, Promise<TrackWithVersions[]>>();

const getCacheKey = (trackId: string) => trackId;

const getAdditionalVersionsCount = (versions: TrackWithVersions[] | undefined): number => {
  if (!versions) {
    return 0;
  }

  return versions.filter(version => !version.isOriginal).length;
};

const notifyListeners = (trackId: string, versions: TrackWithVersions[]) => {
  const cacheKey = getCacheKey(trackId);
  const trackListeners = listeners.get(cacheKey);
  if (!trackListeners) {
    return;
  }

  trackListeners.forEach(listener => {
    try {
      listener(versions);
    } catch (error) {
      logError('Track versions listener failed', error as Error, 'useTrackVersions', { trackId });
    }
  });
};

const setCache = (trackId: string, versions: TrackWithVersions[]) => {
  const cacheKey = getCacheKey(trackId);
  versionsCache.set(cacheKey, versions);
  notifyListeners(trackId, versions);
};

const subscribeToTrackVersions = (trackId: string, listener: VersionsListener) => {
  if (!trackId) {
    return () => {};
  }

  const cacheKey = getCacheKey(trackId);
  const subscribers = listeners.get(cacheKey) ?? new Set<VersionsListener>();
  subscribers.add(listener);
  listeners.set(cacheKey, subscribers);

  return () => {
    const currentSubscribers = listeners.get(cacheKey);
    if (!currentSubscribers) {
      return;
    }
    currentSubscribers.delete(listener);
    if (currentSubscribers.size === 0) {
      listeners.delete(cacheKey);
    }
  };
};

interface FetchOptions {
  force?: boolean;
}

const fetchTrackVersions = async (trackId: string, options: FetchOptions = {}) => {
  if (!trackId) {
    return [];
  }

  const cacheKey = getCacheKey(trackId);

  if (!options.force) {
    const cached = versionsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pending = inFlightRequests.get(cacheKey);
    if (pending) {
      return pending;
    }
  }

  const request = getTrackWithVersions(trackId)
    .then(versions => {
      inFlightRequests.delete(cacheKey);
      setCache(trackId, versions);
      return versions;
    })
    .catch(error => {
      inFlightRequests.delete(cacheKey);
      throw error;
    });

  inFlightRequests.set(cacheKey, request);
  return request;
};

export const primeTrackVersionsCache = (trackId: string, versions: TrackWithVersions[]) => {
  if (!trackId) {
    return;
  }

  setCache(trackId, versions);
};

export const invalidateTrackVersionsCache = (trackId: string) => {
  if (!trackId) {
    return;
  }

  const cacheKey = getCacheKey(trackId);
  versionsCache.delete(cacheKey);
  notifyListeners(trackId, []);
};

/**
 * Интерфейс возвращаемого значения хука
 */
interface UseTrackVersionsReturn {
  /** Массив дополнительных версий (без основной) */
  versions: TrackWithVersions[];

  /** Массив всех версий (с учётом оригинала) */
  allVersions: TrackWithVersions[];

  /** Индикатор загрузки */
  isLoading: boolean;

  /** Количество дополнительных версий */
  versionCount: number;

  /** Количество дополнительных версий (без основной) */
  additionalVersionCount: number;

  /** Общее количество версий (включая основную) */
  totalVersionCount: number;

  /** Основной трек (оригинальная версия) */
  mainVersion: TrackWithVersions | null;

  /** Мастер-версия трека (или основная если мастер не задан) */
  masterVersion: TrackWithVersions | null;

  /** Есть ли несколько версий */
  hasVersions: boolean;
  
  /** Функция для ручной перезагрузки версий */
  loadVersions: (options?: FetchOptions) => Promise<void>;
  
  /** Ошибка загрузки (если есть) */
  error: Error | null;
}

/**
 * Хук для работы с версиями трека
 * 
 * Автоматически загружает версии при монтировании и при изменении trackId
 * Предоставляет удобный интерфейс для работы с версиями
 * 
 * @param trackId - ID трека для загрузки версий
 * @param autoLoad - Автоматически загружать версии при монтировании (по умолчанию true)
 * @returns Объект с версиями и вспомогательными функциями
 */
export function useTrackVersions(
  trackId: string | null | undefined,
  autoLoad: boolean = true
): UseTrackVersionsReturn {
  // ===== Состояние =====
  const [allVersions, setAllVersions] = useState<TrackWithVersions[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * Загрузить версии трека из БД
   * 
   * Процесс:
   * 1. Проверить валидность trackId
   * 2. Загрузить все версии через getTrackWithVersions
   * 3. Обновить состояние
   * 4. Логировать результат
   */
  const loadVersions = useCallback(async (options: FetchOptions = {}) => {
    // Проверка валидности ID
    if (!trackId) {
      setAllVersions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logInfo('Loading track versions', 'useTrackVersions', {
        trackId,
        force: options.force ?? false,
      });

      // Загрузка версий из БД с учётом кэша
      const loadedVersions = await fetchTrackVersions(trackId, options);

      setAllVersions(loadedVersions);

      logInfo(
        `Loaded ${getAdditionalVersionsCount(loadedVersions)} version(s) for track`,
        'useTrackVersions',
        {
          trackId,
          versionCount: getAdditionalVersionsCount(loadedVersions),
          totalVersionCount: loadedVersions.length,
        }
      );
    } catch (err) {
      const error = err as Error;
      setError(error);
      logError(
        'Failed to load track versions',
        error,
        'useTrackVersions',
        { trackId }
      );
    } finally {
      setIsLoading(false);
    }
  }, [trackId]);
  
  /**
   * Автоматическая загрузка версий при изменении trackId
   */
  useEffect(() => {
    if (!trackId) {
      setAllVersions([]);
      return;
    }

    const cached = versionsCache.get(getCacheKey(trackId));
    if (cached) {
      setAllVersions(cached);
    }

    const unsubscribe = subscribeToTrackVersions(trackId, setAllVersions);

    if (autoLoad) {
      loadVersions({ force: false }).catch(error => {
        logError('Failed to auto-load track versions', error as Error, 'useTrackVersions', { trackId });
      });
    }

    return () => {
      unsubscribe();
    };
  }, [trackId, autoLoad, loadVersions]);
  
  // ===== Вычисляемые свойства =====
  
  /** Определяем основную версию трека */
  const mainVersion =
    allVersions.find(version => version.isOriginal) ??
    allVersions.find(version => version.id === trackId) ??
    null;

  /** Дополнительные версии без основной */
  const versions = allVersions.filter(version => !version.isOriginal);

  const versionCount = versions.length;

  const totalVersionCount = allVersions.length;

  /** Мастер-версия трека */
  const masterVersion = getMasterVersion(allVersions);

  /** Есть ли несколько версий */
  const hasVersions = versionCount > 0;

  /** Количество дополнительных версий (без учёта оригинала) */
  const additionalVersionCount = versionCount;

  return {
    versions,
    allVersions,
    isLoading,
    versionCount,
    additionalVersionCount,
    totalVersionCount,
    mainVersion,
    masterVersion,
    hasVersions,
    loadVersions,
    error,
  };
}

/**
 * Хук для быстрого получения количества версий
 * 
 * Легковесная версия useTrackVersions, которая возвращает только количество
 * Используется когда нужно показать бадж с количеством версий
 * 
 * @param trackId - ID трека
 * @returns Количество версий
 */
export function useTrackVersionCount(trackId: string | null | undefined): number {
  const [count, setCount] = useState(() =>
    trackId ? getAdditionalVersionsCount(versionsCache.get(getCacheKey(trackId))) : 0,
  );

  useEffect(() => {
    if (!trackId) {
      setCount(0);
      return;
    }

    const cacheKey = getCacheKey(trackId);
    const cached = versionsCache.get(cacheKey);
    if (cached) {
      setCount(getAdditionalVersionsCount(cached));
    }

    const unsubscribe = subscribeToTrackVersions(trackId, (versions) => {
      setCount(getAdditionalVersionsCount(versions));
    });

    fetchTrackVersions(trackId).catch(error => {
      logError('Failed to load track version count', error as Error, 'useTrackVersions', { trackId });
    });

    return () => {
      unsubscribe();
    };
  }, [trackId]);

  return count;
}
