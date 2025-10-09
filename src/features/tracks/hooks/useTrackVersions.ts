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
import { getTrackWithVersions, TrackWithVersions, getMasterVersion } from '../api/trackVersions';
import { logInfo, logError } from '@/utils/logger';

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
  const loadVersions = useCallback(async () => {
    // Проверка валидности ID
    if (!trackId) {
      setAllVersions([]);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      logInfo('Loading track versions', 'useTrackVersions', { trackId });
      
      // Загрузка версий из БД
      const loadedVersions = await getTrackWithVersions(trackId);

      setAllVersions(loadedVersions);

      const additionalVersions = loadedVersions.filter(version =>
        !(version.versionNumber === 0 || version.id === trackId)
      );

      logInfo(
        `Loaded ${additionalVersions.length} version(s) for track`,
        'useTrackVersions',
        {
          trackId,
          versionCount: additionalVersions.length,
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
    if (autoLoad) {
      loadVersions();
    }
  }, [loadVersions, autoLoad]);
  
  // ===== Вычисляемые свойства =====
  
  /** Определяем основную версию трека */
  const mainVersion = allVersions.find(
    version => version.id === trackId || version.versionNumber === 0
  ) ?? null;

  /** Дополнительные версии без основной */
  const versions = allVersions.filter(version => version.id !== mainVersion?.id);

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
  const { versionCount } = useTrackVersions(trackId, true);
  return versionCount;
}
