/**
 * useTrackVersions Hook
 * 
 * Кастомный хук для работы с версиями треков
 * Упрощает загрузку и управление версиями треков из БД
 * 
 * Использование:
 * ```tsx
 * const { versions, isLoading, versionCount, loadVersions } = useTrackVersions(trackId);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { getTrackWithVersions, TrackWithVersions, getMasterVersion, hasMultipleVersions } from '@/utils/trackVersions';
import { logInfo, logError } from '@/utils/logger';

/**
 * Интерфейс возвращаемого значения хука
 */
interface UseTrackVersionsReturn {
  /** Массив всех версий трека (включая основную) */
  versions: TrackWithVersions[];
  
  /** Индикатор загрузки */
  isLoading: boolean;
  
  /** Количество версий (включая основную) */
  versionCount: number;
  
  /** Количество дополнительных версий (без основной) */
  additionalVersionCount: number;
  
  /** Мастер-версия трека (или основная если мастер не задан) */
  masterVersion: TrackWithVersions | null;
  
  /** Есть ли несколько версий */
  hasVersions: boolean;
  
  /** Функция для ручной перезагрузки версий */
  loadVersions: () => Promise<void>;
  
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
  const [versions, setVersions] = useState<TrackWithVersions[]>([]);
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
  const loadVersions = useCallback(async () => {
    // Проверка валидности ID
    if (!trackId) {
      setVersions([]);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      logInfo('Loading track versions', 'useTrackVersions', { trackId });
      
      // Загрузка версий из БД
      const loadedVersions = await getTrackWithVersions(trackId);
      
      setVersions(loadedVersions);
      
      logInfo(
        `Loaded ${loadedVersions.length} version(s) for track`,
        'useTrackVersions',
        { trackId, versionCount: loadedVersions.length }
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
    if (autoLoad) {
      loadVersions();
    }
  }, [loadVersions, autoLoad]);
  
  // ===== Вычисляемые свойства =====
  
  /** Количество версий (включая основную) */
  const versionCount = versions.length;
  
  /** Мастер-версия трека */
  const masterVersion = getMasterVersion(versions);
  
  /** Есть ли несколько версий */
  const hasVersions = hasMultipleVersions(versions);
  
  /** Количество дополнительных версий (без учёта оригинала) */
  const additionalVersionCount = Math.max(versionCount - 1, 0);
  
  return {
    versions,
    isLoading,
    versionCount,
    additionalVersionCount, // Добавляем новое поле
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
  const { versionCount } = useTrackVersions(trackId, true);
  return versionCount;
}
