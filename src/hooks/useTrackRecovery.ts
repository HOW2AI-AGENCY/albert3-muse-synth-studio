import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ApiService } from '@/services/api.service';
import { logInfo, logError } from '@/utils/logger';

interface UseTrackRecoveryOptions {
  enabled?: boolean;
  checkIntervalMs?: number;
  pendingThresholdMs?: number;
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
      const { data: pendingTracks, error } = await supabase
        .from('tracks')
        .select('id, title, created_at, prompt, provider, lyrics, has_vocals, style_tags')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .is('suno_id', null) // Треки без suno_id точно не были отправлены
        .order('created_at', { ascending: true });

      if (error) {
        logError('Failed to fetch pending tracks', error, 'useTrackRecovery');
        return;
      }

      if (!pendingTracks || pendingTracks.length === 0) {
        logInfo('No stuck tracks found', 'useTrackRecovery');
        return;
      }

      // Фильтруем треки старше порога и не находящиеся в процессе восстановления
      const stuckTracks = pendingTracks.filter(track => {
        const trackAge = now - new Date(track.created_at).getTime();
        const isStuck = trackAge > pendingThresholdMs;
        const isNotProcessing = !processingTracksRef.current.has(track.id);
        
        return isStuck && isNotProcessing;
      });

      if (stuckTracks.length === 0) {
        logInfo('No tracks need recovery', 'useTrackRecovery', {
          pendingCount: pendingTracks.length,
          processingCount: processingTracksRef.current.size
        });
        return;
      }

      logInfo(`Found ${stuckTracks.length} stuck track(s), attempting recovery`, 'useTrackRecovery', {
        trackIds: stuckTracks.map(t => t.id)
      });

      // Восстанавливаем каждый трек
      for (const track of stuckTracks) {
        try {
          // Отмечаем трек как обрабатываемый
          processingTracksRef.current.add(track.id);

          logInfo(`Recovering track: ${track.title}`, 'useTrackRecovery', {
            trackId: track.id,
            age: Math.round((now - new Date(track.created_at).getTime()) / 1000) + 's'
          });

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

          toast.success(`Восстановление: ${track.title}`, {
            description: 'Запрос на генерацию отправлен повторно',
            duration: 3000,
          });

          logInfo(`Successfully recovered track: ${track.title}`, 'useTrackRecovery', {
            trackId: track.id
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
          // Убираем трек из списка обрабатываемых через 30 секунд
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
  }, [userId, enabled, checkIntervalMs, pendingThresholdMs, refreshTracks]);

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
