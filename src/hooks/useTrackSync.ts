/**
 * Hook for automatic track synchronization and recovery
 * Monitors track generation and auto-recovers from failures
 *
 * ✅ REFACTORED: Now uses RealtimeSubscriptionManager (P0-2 fix)
 * - Eliminates manual channel management
 * - Automatic deduplication with other subscriptions
 * - Simplified retry logic (handled by Supabase)
 */

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logInfo, logWarn, logError } from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { trackVersionsQueryKeys } from '@/features/tracks/api/trackVersions';
import RealtimeSubscriptionManager from '@/services/realtimeSubscriptionManager';
import type { Database } from '@/integrations/supabase/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TrackRow = Database['public']['Tables']['tracks']['Row'];


interface TrackSyncOptions {
  onTrackCompleted?: (trackId: string) => void;
  onTrackFailed?: (trackId: string, error: string | null) => void;
  enabled?: boolean;
}

export const useTrackSync = (userId: string | undefined, options: TrackSyncOptions = {}) => {
  const { toast } = useToast();
  const toastRef = useRef<ReturnType<typeof useToast>['toast'] | null>(null);
  const onTrackCompletedRef = useRef<TrackSyncOptions['onTrackCompleted']>();
  const onTrackFailedRef = useRef<TrackSyncOptions['onTrackFailed']>();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const queryClient = useQueryClient();
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

  // ✅ REFACTORED: Simplified subscription management using RealtimeSubscriptionManager
  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    logInfo('Starting track sync via manager', 'useTrackSync', { userId });

    // Handler for track status updates (completed, failed, processing)
    const handleTrackUpdate = (payload: RealtimePostgresChangesPayload<TrackRow>) => {
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
        queryClient.invalidateQueries({ queryKey: trackVersionsQueryKeys.list(newTrack.id) });
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
    };

    // Subscribe to user tracks via centralized manager
    const unsubscribeTracks = RealtimeSubscriptionManager.subscribeToUserTracks(
      userId,
      null, // All projects
      handleTrackUpdate
    );

    setIsSubscribed(true);
    logInfo('Subscribed to user tracks', 'useTrackSync', { userId });

    return () => {
      unsubscribeTracks();
      setIsSubscribed(false);
      logInfo('Unsubscribed from track sync', 'useTrackSync', { userId });
    };
  }, [userId, enabled, queryClient]);

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
    isSubscribed,
  };
};
