import { useCallback } from 'react';
import { logInfo, logError } from '@/utils/logger';

const STORAGE_KEY_PREFIX = 'track_master_version_';

/**
 * Хук для сохранения и восстановления выбранной мастер-версии между перезагрузками
 */
export const useMasterVersionPersistence = () => {
  const getStorageKey = useCallback((id: string) => {
    return `${STORAGE_KEY_PREFIX}${id}`;
  }, []);

  const getMasterVersionFromStorage = useCallback((id: string): string | null => {
    try {
      const key = getStorageKey(id);
      return localStorage.getItem(key);
    } catch (error) {
      logError('Failed to get master version from storage', error as Error, 'useMasterVersionPersistence', { trackId: id });
      return null;
    }
  }, [getStorageKey]);

  const setMasterVersionToStorage = useCallback((id: string, versionId: string) => {
    try {
      const key = getStorageKey(id);
      localStorage.setItem(key, versionId);
      logInfo('Master version saved to storage', 'useMasterVersionPersistence', { trackId: id, versionId });
    } catch (error) {
      logError('Failed to save master version to storage', error as Error, 'useMasterVersionPersistence', { trackId: id, versionId });
    }
  }, [getStorageKey]);

  const removeMasterVersionFromStorage = useCallback((id: string) => {
    try {
      const key = getStorageKey(id);
      localStorage.removeItem(key);
      logInfo('Master version removed from storage', 'useMasterVersionPersistence', { trackId: id });
    } catch (error) {
      logError('Failed to remove master version from storage', error as Error, 'useMasterVersionPersistence', { trackId: id });
    }
  }, [getStorageKey]);

  return {
    getMasterVersionFromStorage,
    setMasterVersionToStorage,
    removeMasterVersionFromStorage,
  };
};
