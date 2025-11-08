/**
 * Hook for automatic track synchronization and recovery
 * Monitors track generation and auto-recovers from failures
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logInfo, logWarn, logError } from '@/utils/logger';
import { invalidateTrackVersionsCache } from '@/features/tracks/hooks/useTrackVersions';
import type { Database } from '@/integrations/supabase/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TrackRow = Database['public']['Tables']['tracks']['Row'];
type TrackVersionRow = Database['public']['Tables']['track_versions']['Row'];


interface TrackSyncOptions {
  onTrackCompleted?: (trackId: string) => void;
  onTrackFailed?: (trackId: string, error: string | null) => void;
  enabled?: boolean;
}

const MIN_RETRY_DELAY = 5000; // 5 секунд минимум между попытками

export const useTrackSync = (userId: string | undefined, options: TrackSyncOptions = {}) => {
  const { toast } = useToast();
  const toastRef = useRef<ReturnType<typeof useToast>['toast'] | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryAttemptRef = useRef(0);
  const lastAttemptRef = useRef<number>(0);
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

    // ✅ FIX: Prevent infinite recursion with proper cleanup
    const reconnectAttemptsRef = { current: 0 };
    const MAX_RECONNECT = 3;
    let reconnectTimeoutId: NodeJS.Timeout | undefined;
    let isMounted = true;
    let isSubscribing = false;

    const setupChannelWithRetry = () => {
      const now = Date.now();
      
      // Prevent multiple simultaneous connections
      if (!isMounted || isSubscribing || (now - lastAttemptRef.current) < MIN_RETRY_DELAY) {
        return null;
      }

      // Cleanup existing channel before creating new one
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (e) {
          logWarn('Error removing channel', 'useTrackSync', { error: e });
        }
        channelRef.current = null;
      }
      
      isSubscribing = true;
      lastAttemptRef.current = now;

      const channelName = `track-updates-${userId}-${Date.now()}`;
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
            if (!isMounted) return;

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
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'track_versions',
          },
          (payload: RealtimePostgresChangesPayload<TrackVersionRow>) => {
            if (!isMounted) return;

            const newVersion = payload.new as TrackVersionRow | undefined;
            const oldVersion = payload.old as TrackVersionRow | undefined;

            // Get parent_track_id from either new or old record
            const parentTrackId = newVersion?.parent_track_id || oldVersion?.parent_track_id;

            if (!parentTrackId) return;

            logInfo('Track version change detected', 'useTrackSync', {
              event: payload.eventType,
              versionId: newVersion?.id || oldVersion?.id,
              parentTrackId,
              variantIndex: newVersion?.variant_index,
            });

            // ✅ FIX: Invalidate cache when track_versions changes
            // This ensures UI updates when new versions are inserted/updated
            invalidateTrackVersionsCache(parentTrackId);

            // Show toast notification for new versions
            if (payload.eventType === 'INSERT' && newVersion) {
              const variantNum = (newVersion.variant_index ?? 0) + 1;
              toastRef.current?.({
                title: '🎵 Новая версия готова',
                description: `Версия ${variantNum} добавлена к треку`,
              });
            }
          }
        )
        .subscribe((status) => {
          if (!isMounted) return;
          
          if (status === 'SUBSCRIBED') {
            // Если был запланирован повторный коннект — отменяем, чтобы избежать гонок
            if (reconnectTimeoutId) {
              clearTimeout(reconnectTimeoutId);
              reconnectTimeoutId = undefined;
            }
            logInfo('Track sync subscribed', 'useTrackSync', { userId });
            reconnectAttemptsRef.current = 0;
            retryAttemptRef.current = 0;
            channelRef.current = channel;
            isSubscribing = false;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            isSubscribing = false;
            
            if (status === 'CHANNEL_ERROR') {
              logError('Track sync channel error', new Error('Channel error'), 'useTrackSync');
            } else if (status === 'TIMED_OUT') {
              logWarn('Track sync timed out', 'useTrackSync');
            } else {
              logWarn('Track sync closed', 'useTrackSync');
            }

            // Clear reconnect timeout if exists
            if (reconnectTimeoutId) {
              clearTimeout(reconnectTimeoutId);
              reconnectTimeoutId = undefined;
            }

            // Cleanup channel
            if (channelRef.current) {
              try {
                supabase.removeChannel(channelRef.current);
              } catch (e) {
                logWarn('Error removing channel on error', 'useTrackSync', { error: e });
              }
              channelRef.current = null;
            }

            // ✅ FIX: Only retry if mounted and under limit
            if (isMounted && reconnectAttemptsRef.current < MAX_RECONNECT) {
              const delay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
              reconnectAttemptsRef.current++;
              retryAttemptRef.current = reconnectAttemptsRef.current;
              
              logInfo('Scheduling reconnect', 'useTrackSync', { 
                attempt: reconnectAttemptsRef.current, 
                delay,
                maxAttempts: MAX_RECONNECT
              });
              
              reconnectTimeoutId = setTimeout(() => {
                // ✅ CRITICAL FIX: Предотвращаем бесконечную рекурсию
                // Проверяем, что канал ещё не создан и не идёт подписка
                if (isMounted && !channelRef.current && !isSubscribing) {
                  isSubscribing = true; // Блокируем повторный вызов
                  setupChannelWithRetry();
                }
              }, delay);
            } else if (reconnectAttemptsRef.current >= MAX_RECONNECT) {
              logError('Max reconnect attempts reached', new Error('Reconnect failed'), 'useTrackSync', {
                attempts: reconnectAttemptsRef.current,
                userId,
              });
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

    // Initial setup
    setupChannelWithRetry();

    // ✅ FIX: Proper cleanup to prevent memory leaks and infinite recursion
    return () => {
      isMounted = false;
      isSubscribing = false;
      
      // Clear all timeouts
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = undefined;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Cleanup channel
      if (channelRef.current) {
        logInfo('Unsubscribing from track sync', 'useTrackSync');
        try {
          supabase.removeChannel(channelRef.current);
        } catch (e) {
          logWarn('Error during channel cleanup', 'useTrackSync', { error: e });
        }
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
