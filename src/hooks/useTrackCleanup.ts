import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ApiService } from '@/services/api.service';
import { logInfo, logError } from '@/utils/logger';

interface UseTrackCleanupOptions {
  enabled?: boolean;
  checkIntervalMs?: number;
  maxRetryAttempts?: number;
  maxAgeInDays?: number;
}

/**
 * Hook для автоматического удаления неудачных треков
 * - Удаляет треки, достигшие максимального количества retry попыток
 * - Удаляет старые failed треки (по умолчанию >7 дней)
 */
export const useTrackCleanup = (
  userId: string | undefined,
  refreshTracks: () => void,
  options: UseTrackCleanupOptions = {}
) => {
  const {
    enabled = true,
    checkIntervalMs = 60 * 60 * 1000, // Проверять каждый час
    maxRetryAttempts = 3,
    maxAgeInDays = 7,
  } = options;

  const lastCheckRef = useRef<number>(0);

  const cleanupFailedTracks = useCallback(async () => {
    if (!userId || !enabled) return;

    const now = Date.now();
    
    // Предотвращаем слишком частые проверки
    if (now - lastCheckRef.current < checkIntervalMs) {
      return;
    }
    
    lastCheckRef.current = now;

    try {
      logInfo('Starting cleanup of failed tracks...', 'useTrackCleanup');

      // 1. Получаем треки с максимальным количеством попыток
      const { data: maxRetriedTracks, error: maxRetriedError } = await supabase
        .from('tracks')
        .select(`
          id, title,
          track_retry_attempts:track_retry_attempts(count)
        `)
        .eq('user_id', userId)
        .eq('status', 'failed');

      if (maxRetriedError) {
        logError('Failed to fetch tracks for cleanup', maxRetriedError, 'useTrackCleanup');
        return;
      }

      const tracksWithMaxRetries = (maxRetriedTracks || [])
        .filter(track => {
          const retryCount = (track.track_retry_attempts as any)?.[0]?.count || 0;
          return retryCount >= maxRetryAttempts;
        })
        .map(t => ({ id: t.id, title: t.title, reason: 'max_retries' }));

      // 2. Получаем старые failed треки
      const maxAgeDate = new Date(now - maxAgeInDays * 24 * 60 * 60 * 1000);
      const { data: oldFailedTracks, error: oldFailedError } = await supabase
        .from('tracks')
        .select('id, title, updated_at')
        .eq('user_id', userId)
        .eq('status', 'failed')
        .lt('updated_at', maxAgeDate.toISOString());

      if (oldFailedError) {
        logError('Failed to fetch old failed tracks', oldFailedError, 'useTrackCleanup');
        return;
      }

      const oldTracks = (oldFailedTracks || []).map(t => ({ 
        id: t.id, 
        title: t.title, 
        reason: 'old_age' 
      }));

      // 3. Объединяем списки (убираем дубликаты)
      const tracksToDelete = [
        ...tracksWithMaxRetries,
        ...oldTracks.filter(ot => !tracksWithMaxRetries.some(mt => mt.id === ot.id))
      ];

      if (tracksToDelete.length === 0) {
        logInfo('No failed tracks to cleanup', 'useTrackCleanup');
        return;
      }

      logInfo(`Found ${tracksToDelete.length} failed track(s) to cleanup`, 'useTrackCleanup', {
        maxRetries: tracksWithMaxRetries.length,
        oldTracks: oldTracks.length
      });

      // 4. Показываем уведомление
      toast.info(`Удаление ${tracksToDelete.length} неудачных треков...`, {
        description: 'Освобождаем место от треков, которые не удалось сгенерировать',
        duration: 5000,
      });

      // 5. Удаляем треки
      let deletedCount = 0;
      for (const track of tracksToDelete) {
        try {
          await ApiService.deleteTrack(track.id);
          deletedCount++;
          
          logInfo(`Deleted failed track: ${track.title}`, 'useTrackCleanup', {
            trackId: track.id,
            reason: track.reason
          });
        } catch (error) {
          logError(`Failed to delete track: ${track.title}`, error as Error, 'useTrackCleanup', {
            trackId: track.id
          });
        }
      }

      if (deletedCount > 0) {
        toast.success(`Удалено ${deletedCount} неудачных треков`, {
          duration: 3000,
        });

        // Обновляем список треков
        refreshTracks();
      }

    } catch (error) {
      logError('Error in cleanup process', error as Error, 'useTrackCleanup');
    }
  }, [userId, enabled, checkIntervalMs, maxRetryAttempts, maxAgeInDays, refreshTracks]);

  // Запускаем cleanup при монтировании и периодически
  useEffect(() => {
    if (!enabled || !userId) return;

    // Первая проверка через 5 секунд после загрузки
    const initialCheckTimeout = setTimeout(() => {
      cleanupFailedTracks();
    }, 5000);

    // Периодическая проверка
    const intervalId = setInterval(() => {
      cleanupFailedTracks();
    }, checkIntervalMs);

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(intervalId);
    };
  }, [enabled, userId, checkIntervalMs, cleanupFailedTracks]);

  return {
    cleanupFailedTracks,
  };
};
