/**
 * Hook for automatic track synchronization and recovery
 * Monitors track generation and auto-recovers from failures
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logInfo, logWarn, logError } from '@/utils/logger';
import { invalidateTrackVersionsCache } from '@/features/tracks/hooks/useTrackVersions';
import type { Database } from '@/integrations/supabase/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TrackRow = Database['public']['Tables']['tracks']['Row'];


interface TrackSyncOptions {
  onTrackCompleted?: (trackId: string) => void;
  onTrackFailed?: (trackId: string, error: string | null) => void;
  enabled?: boolean;
}

const MIN_RETRY_DELAY = 5000; // 5 секунд минимум между попытками
const MAX_RETRY_ATTEMPTS = 3; // Уменьшено с 5 до 3

export const useTrackSync = (userId: string | undefined, options: TrackSyncOptions = {}) => {
  const { toast } = useToast();
  const toastRef = useRef<ReturnType<typeof useToast>['toast'] | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryAttemptRef = useRef(0);
  const lastAttemptRef = useRef<number>(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const onTrackCompletedRef = useRef<TrackSyncOptions['onTrackCompleted']>();
  const onTrackFailedRef = useRef<TrackSyncOptions['onTrackFailed']>();
  const { onTrackCompleted, onTrackFailed, enabled = true } = options;

  useEffect(() => {
    onTrackCompletedRef.current = onTrackCompleted;
  }, [onTrackCompleted]);

  useEffect(() => {
    onTrackFailedRef.current = onTrackFailed;
  }, [onTrackFailed]);

  useEffect(() => {
    // Keep toast function stable across renders to avoid resubscribe loops
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    logInfo('Starting track sync for user', 'useTrackSync', { userId });

    const channelName = `track-updates-${userId}`;

    const clearRetryTimeout = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    const subscribeToChannel = () => {
      const now = Date.now();
      
      // Предотвращаем множественные одновременные подключения
      if (isConnecting || (now - lastAttemptRef.current) < MIN_RETRY_DELAY) {
        logWarn('Skipping subscription attempt - too soon or already connecting', 'useTrackSync');
        return;
      }

      // Проверяем, есть ли уже активное подключение
      if (channelRef.current) {
        logWarn('Channel already exists, cleaning up before reconnect', 'useTrackSync');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      setIsConnecting(true);
      lastAttemptRef.current = now;
      clearRetryTimeout();

      const channel = supabase.channel(channelName);

      channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tracks',
            filter: `user_id=eq.${userId}`,
          },
          (payload: RealtimePostgresChangesPayload<TrackRow>) => {
            const newTrack = payload.new;
            const oldTrack = payload.old;

            if (!newTrack || !oldTrack) {
              return;
            }

            if (!newTrack || !('id' in newTrack) || !('status' in newTrack)) {
              return;
            }

            logInfo('Track update received', 'useTrackSync', {
              trackId: newTrack.id,
              oldStatus: oldTrack && 'status' in oldTrack ? oldTrack.status : undefined,
              newStatus: newTrack.status,
            });

            // Track completed
            if (oldTrack && 'status' in oldTrack && oldTrack.status !== 'completed' && newTrack.status === 'completed') {
              logInfo('Track completed', 'useTrackSync', { trackId: newTrack.id });

              toastRef.current?.({
                title: '✅ Трек готов!',
                description: `"${newTrack.title}" успешно сгенерирован`,
              });

              // Invalidate version cache to force reload
              invalidateTrackVersionsCache(newTrack.id);
              logInfo('Invalidated version cache for completed track', 'useTrackSync', { trackId: newTrack.id });

              onTrackCompletedRef.current?.(newTrack.id);
            }

            // Track failed
            if (oldTrack && 'status' in oldTrack && oldTrack.status !== 'failed' && newTrack.status === 'failed') {
              logWarn('Track failed', 'useTrackSync', {
                trackId: newTrack.id,
                error: newTrack.error_message,
              });

              toastRef.current?.({
                title: '❌ Ошибка генерации',
                description: newTrack.error_message || 'Не удалось создать трек',
                variant: 'destructive',
              });

              onTrackFailedRef.current?.(newTrack.id, newTrack.error_message ?? null);
            }

            // Track processing (from pending)
            if (oldTrack && 'status' in oldTrack && oldTrack.status === 'pending' && newTrack.status === 'processing') {
              logInfo('Track processing started', 'useTrackSync', { trackId: newTrack.id });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logInfo('Track sync subscribed', 'useTrackSync');
            retryAttemptRef.current = 0;
            channelRef.current = channel;
            setIsConnecting(false);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setIsConnecting(false);
            const attempt = retryAttemptRef.current;

            if (status === 'CHANNEL_ERROR') {
              logError('Track sync channel error', new Error('Channel error'), 'useTrackSync');
            } else if (status === 'TIMED_OUT') {
              logWarn('Track sync timed out', 'useTrackSync');
            } else {
              logWarn('Track sync closed unexpectedly', 'useTrackSync');
            }

            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }

            if (attempt >= MAX_RETRY_ATTEMPTS) {
              logError('Track sync retry limit reached', new Error('Realtime connection failed'), 'useTrackSync');
              return;
            }

            retryAttemptRef.current = attempt + 1;
            const delay = Math.min(2 ** attempt * 1000, 30000);

            clearRetryTimeout();
            retryTimeoutRef.current = setTimeout(() => {
              // Guard: предотвращаем infinite loop при множественных reconnect attempts
              if (!channelRef.current && !isConnecting) {
                subscribeToChannel();
              }
            }, delay);
          }
        });
    };

    // ✅ Phase 4: Обновлённая логика подписки с улучшенным reconnection
    const reconnectAttempts = { current: 0 };
    const MAX_RECONNECT = 5;
    let reconnectTimeout: NodeJS.Timeout;

    const setupChannelWithRetry = () => {
      const channel = supabase
        .channel('tracks')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tracks',
            filter: `user_id=eq.${userId}`,
          },
          (payload: RealtimePostgresChangesPayload<TrackRow>) => {
            const newTrack = payload.new;
            const oldTrack = payload.old;

            if (!newTrack || !oldTrack || !('id' in newTrack) || !('status' in newTrack)) {
              return;
            }

            logInfo('Track update received', 'useTrackSync', {
              trackId: newTrack.id,
              oldStatus: 'status' in oldTrack ? oldTrack.status : undefined,
              newStatus: newTrack.status,
            });

            // Track completed
            if ('status' in oldTrack && oldTrack.status !== 'completed' && newTrack.status === 'completed') {
              logInfo('Track completed', 'useTrackSync', { trackId: newTrack.id });
              toastRef.current?.({
                title: '✅ Трек готов!',
                description: `"${newTrack.title}" успешно сгенерирован`,
              });
              invalidateTrackVersionsCache(newTrack.id);
              onTrackCompletedRef.current?.(newTrack.id);
            }

            // Track failed
            if ('status' in oldTrack && oldTrack.status !== 'failed' && newTrack.status === 'failed') {
              logWarn('Track failed', 'useTrackSync', {
                trackId: newTrack.id,
                error: newTrack.error_message,
              });
              toastRef.current?.({
                title: '❌ Ошибка генерации',
                description: newTrack.error_message || 'Не удалось создать трек',
                variant: 'destructive',
              });
              onTrackFailedRef.current?.(newTrack.id, newTrack.error_message ?? null);
            }

            // Track processing
            if ('status' in oldTrack && oldTrack.status === 'pending' && newTrack.status === 'processing') {
              logInfo('Track processing started', 'useTrackSync', { trackId: newTrack.id });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logInfo('Track sync subscribed', 'useTrackSync');
            reconnectAttempts.current = 0;
            channelRef.current = channel;
            setIsConnecting(false);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            setIsConnecting(false);
            
            if (status === 'CHANNEL_ERROR') {
              logError('Track sync channel error', new Error('Channel error'), 'useTrackSync');
            } else {
              logWarn('Track sync closed', 'useTrackSync');
            }

            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }

            // ✅ Exponential backoff retry
            if (reconnectAttempts.current < MAX_RECONNECT) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
              reconnectAttempts.current++;
              
              logInfo('[useTrackSync] Attempting reconnect', undefined, { 
                attempt: reconnectAttempts.current, 
                delay 
              });
              
              reconnectTimeout = setTimeout(() => {
                if (!channelRef.current && !isConnecting) {
                  setupChannelWithRetry();
                }
              }, delay);
            } else {
              logError('🔴 [useTrackSync] Max reconnect attempts reached', new Error('Reconnect failed'), 'useTrackSync');
              toastRef.current?.({
                title: 'Потеряно соединение',
                description: 'Обновите страницу для восстановления',
                variant: 'destructive',
              });
            }
          }
        });

      return channel;
    };

    const initialChannel = setupChannelWithRetry();
    channelRef.current = initialChannel;

    return () => {
      clearTimeout(reconnectTimeout);
      setIsConnecting(false);

      if (channelRef.current) {
        logInfo('Unsubscribing from track sync', 'useTrackSync');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, enabled]);

  // Check for stale processing tracks on mount
  useEffect(() => {
    if (!userId || !enabled) return;

    const checkStaleTracks = async () => {
      try {
        const { data: processingTracks, error } = await supabase
          .from('tracks')
          .select('id, title, created_at, status')
          .eq('user_id', userId)
          .eq('status', 'processing');

        if (error) {
          logError('Failed to check stale tracks', error, 'useTrackSync');
          return;
        }

        if (processingTracks && processingTracks.length > 0) {
          const now = Date.now();
          const staleTracks = processingTracks.filter((track) => {
            const elapsed = now - new Date(track.created_at).getTime();
            return elapsed > 600000; // 10 minutes
          });

          if (staleTracks.length > 0) {
            logWarn('Found stale processing tracks', 'useTrackSync', {
              count: staleTracks.length,
              trackIds: staleTracks.map((t) => t.id),
            });

            toastRef.current?.({
              title: '⚠️ Незавершённые треки',
              description: `Найдено ${staleTracks.length} треков в процессе генерации более 10 минут. Попробуйте перезапустить их.`,
              variant: 'default',
            });
          }
        }
      } catch (error) {
        logError('Error checking stale tracks', error as Error, 'useTrackSync');
      }
    };

    checkStaleTracks();
  }, [userId, enabled]);

  return {
    isSubscribed: channelRef.current !== null,
  };
};
