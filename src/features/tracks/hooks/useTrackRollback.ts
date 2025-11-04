import { useCallback } from 'react';
import { toast } from 'sonner';
import { logError, logInfo } from '@/utils/logger';
import { setMasterVersion as setMasterVersionApi, unwrapResult } from '../api/trackVersions';
import { TrackOperationsLogger } from '@/services/track-operations.logger';
import { invalidateTrackVersionsCache, fetchTrackVersions } from './useTrackVersions';

/**
 * useTrackRollback
 * 
 * Хук предоставляет функцию отката к выбранной версии трека.
 * Под капотом использует API установки мастер-версии и централизованное логирование.
 */
export const useTrackRollback = (trackId: string | null | undefined) => {
  const rollbackToVersion = useCallback(async (versionId: string) => {
    if (!trackId) {
      logError('Rollback failed: missing trackId', new Error('Invalid trackId'), 'useTrackRollback', { versionId });
      toast.error('Не удалось выполнить откат: отсутствует идентификатор трека');
      return;
    }

    await TrackOperationsLogger.trackOperation('rollback', trackId, async () => {
      logInfo('Rollback to version initiated', 'useTrackRollback', { trackId, versionId });

      const result = await setMasterVersionApi(trackId, versionId);
      unwrapResult(result);

      // Обновить кэш версий, чтобы UI сразу отразил изменения
      invalidateTrackVersionsCache(trackId);
      await fetchTrackVersions(trackId, { force: true });

      toast.success('Откат выполнен: выбрана указанная версия как главная');
      logInfo('Rollback to version completed', 'useTrackRollback', { trackId, versionId });
    });
  }, [trackId]);

  return { rollbackToVersion };
};