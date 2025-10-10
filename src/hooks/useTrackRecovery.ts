import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ApiService } from '@/services/api.service';
import { logInfo, logError } from '@/utils/logger';

interface UseTrackRecoveryOptions {
  enabled?: boolean;
  checkIntervalMs?: number;
  pendingThresholdMs?: number;
  maxRetryAttempts?: number;
}

/**
 * Hook для автоматического восстановления "застрявших" треков
 * Проверяет треки в статусе pending и повторно отправляет запросы на генерацию
 */
export const useTrackRecovery = (
  userId: string | undefined,
  refreshTracks: () => void,
  options: UseTrackRecoveryOptions = {}
) => {
  const {
    enabled = true,
    checkIntervalMs = 60000, // Проверять каждую минуту
    pendingThresholdMs = 120000, // Считать "застрявшими" треки старше 2 минут
    maxRetryAttempts = 3,
  } = options;

  const processingTracksRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<number>(0);

  const recoverStuckTracks = useCallback(async () => {
    if (!userId || !enabled) return;

    const now = Date.now();
    
    // Предотвращаем слишком частые проверки
    if (now - lastCheckRef.current < checkIntervalMs) {
      return;
    }
    
    lastCheckRef.current = now;

    try {
      logInfo('Checking for stuck tracks...', 'useTrackRecovery');

      // Получаем все треки в статусе pending
      const { data: pendingTracks, error: pendingError } = await supabase
        .from('tracks')
        .select('id, title, created_at, prompt, provider, lyrics, has_vocals, style_tags, metadata')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .is('suno_id', null)
        .order('created_at', { ascending: true });

      if (pendingError) {
        logError('Failed to fetch pending tracks', pendingError, 'useTrackRecovery');
        return;
      }

      // Получаем failed треки с количеством попыток
      const { data: failedTracksData, error: failedError } = await supabase
        .from('tracks')
        .select(`
          id, title, created_at, updated_at, prompt, provider, lyrics, has_vocals, style_tags, error_message,
          track_retry_attempts:track_retry_attempts(count)
        `)
        .eq('user_id', userId)
        .eq('status', 'failed')
        .order('updated_at', { ascending: true });

      if (failedError) {
        logError('Failed to fetch failed tracks', failedError, 'useTrackRecovery');
        return;
      }

      // Преобразуем failed треки с подсчетом попыток
      const failedTracks = (failedTracksData || []).map(track => ({
        ...track,
        retry_count: (track.track_retry_attempts as any)?.[0]?.count || 0
      }));

      // Фильтруем pending треки старше порога
    const stuckPendingTracks = (pendingTracks || []).filter(track => {
      const trackAge = now - new Date(track.created_at).getTime();
      const isStuck = trackAge > pendingThresholdMs;
      const isNotProcessing = !processingTracksRef.current.has(track.id);
      
      // ✅ Не retry если уже есть suno_task_id - значит запрос уже отправлен
      const hasSunoTask = track.metadata && 
        typeof track.metadata === 'object' && 
        'suno_task_id' in track.metadata;
      
      return isStuck && isNotProcessing && !hasSunoTask;
    });

      // Фильтруем failed треки для retry (с exponential backoff)
      const retriableFailedTracks = failedTracks.filter(track => {
        if (track.retry_count >= maxRetryAttempts) return false;
        if (processingTracksRef.current.has(track.id)) return false;

        // Exponential backoff: 1min, 2min, 4min
        const retryDelay = Math.pow(2, track.retry_count) * 60000;
        const timeSinceFailure = now - new Date(track.updated_at).getTime();
        
        return timeSinceFailure >= retryDelay;
      });

      const allRecoverableTracks = [...stuckPendingTracks, ...retriableFailedTracks];

      if (allRecoverableTracks.length === 0) {
        logInfo('No tracks need recovery', 'useTrackRecovery', {
          pendingCount: pendingTracks?.length || 0,
          failedCount: failedTracks.length,
          processingCount: processingTracksRef.current.size
        });
        return;
      }

      logInfo(`Found ${allRecoverableTracks.length} track(s) for recovery`, 'useTrackRecovery', {
        pending: stuckPendingTracks.length,
        failed: retriableFailedTracks.length
      });

      // Восстанавливаем каждый трек
      for (const track of allRecoverableTracks) {
        try {
          processingTracksRef.current.add(track.id);

          const retryCount = (track as any).retry_count as number || 0;
          const isRetry = retryCount > 0;

          logInfo(`${isRetry ? 'Retrying' : 'Recovering'} track: ${track.title}`, 'useTrackRecovery', {
            trackId: track.id,
            retryAttempt: retryCount + 1,
            maxAttempts: maxRetryAttempts
          });

          // Записываем попытку retry для failed треков
          if (isRetry) {
            await supabase.from('track_retry_attempts').insert({
              track_id: track.id,
              attempt_number: retryCount + 1,
              error_message: (track as any).error_message || null
            });
          }

          // Повторно отправляем запрос на генерацию
          await ApiService.generateMusic({
            trackId: track.id,
            userId,
            title: track.title,
            prompt: track.prompt,
            provider: (track.provider as 'replicate' | 'suno') || 'suno',
            lyrics: track.lyrics || undefined,
            hasVocals: track.has_vocals ?? false,
            styleTags: track.style_tags || undefined,
          });

          toast.success(
            isRetry 
              ? `Повторная попытка ${retryCount + 1}/${maxRetryAttempts}: ${track.title}`
              : `Восстановление: ${track.title}`,
            {
              description: 'Запрос на генерацию отправлен',
              duration: 3000,
            }
          );

          logInfo(`Successfully ${isRetry ? 'retried' : 'recovered'} track`, 'useTrackRecovery', {
            trackId: track.id,
            retryAttempt: retryCount + 1
          });

        } catch (error) {
          logError(`Failed to recover track: ${track.title}`, error as Error, 'useTrackRecovery', {
            trackId: track.id
          });

          toast.error(`Ошибка восстановления: ${track.title}`, {
            description: error instanceof Error ? error.message : 'Неизвестная ошибка',
            duration: 5000,
          });
        } finally {
          setTimeout(() => {
            processingTracksRef.current.delete(track.id);
          }, 30000);
        }
      }

      // Обновляем список треков после восстановления
      refreshTracks();

    } catch (error) {
      logError('Error in track recovery process', error as Error, 'useTrackRecovery');
    }
  }, [userId, enabled, checkIntervalMs, pendingThresholdMs, maxRetryAttempts, refreshTracks]);

  // Запускаем проверку при монтировании и при изменении userId
  useEffect(() => {
    if (!enabled || !userId) return;

    // Первая проверка сразу после монтирования
    const initialCheckTimeout = setTimeout(() => {
      recoverStuckTracks();
    }, 3000); // Задержка 3 секунды после загрузки

    // Периодическая проверка
    const intervalId = setInterval(() => {
      recoverStuckTracks();
    }, checkIntervalMs);

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(intervalId);
    };
  }, [enabled, userId, checkIntervalMs, recoverStuckTracks]);

  return {
    recoverStuckTracks,
    processingTracksCount: processingTracksRef.current.size,
  };
};
