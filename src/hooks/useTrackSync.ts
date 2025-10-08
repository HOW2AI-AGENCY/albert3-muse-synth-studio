/**
 * Hook for automatic track synchronization and recovery
 * Monitors track generation and auto-recovers from failures
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logInfo, logWarn, logError } from '@/utils/logger';

interface TrackSyncOptions {
  onTrackCompleted?: (trackId: string) => void;
  onTrackFailed?: (trackId: string, error: string) => void;
  enabled?: boolean;
}

export const useTrackSync = (userId: string | undefined, options: TrackSyncOptions = {}) => {
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const { onTrackCompleted, onTrackFailed, enabled = true } = options;

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    logInfo('Starting track sync for user', 'useTrackSync', { userId });

    // Subscribe to real-time track updates
    const channel = supabase
      .channel('track-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tracks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newTrack = payload.new;
          const oldTrack = payload.old;

          logInfo('Track update received', 'useTrackSync', {
            trackId: newTrack.id,
            oldStatus: oldTrack.status,
            newStatus: newTrack.status,
          });

          // Track completed
          if (oldTrack.status !== 'completed' && newTrack.status === 'completed') {
            logInfo('Track completed', 'useTrackSync', { trackId: newTrack.id });
            
            toast({
              title: '✅ Трек готов!',
              description: `"${newTrack.title}" успешно сгенерирован`,
            });

            onTrackCompleted?.(newTrack.id);
          }

          // Track failed
          if (oldTrack.status !== 'failed' && newTrack.status === 'failed') {
            logWarn('Track failed', 'useTrackSync', {
              trackId: newTrack.id,
              error: newTrack.error_message,
            });

            toast({
              title: '❌ Ошибка генерации',
              description: newTrack.error_message || 'Не удалось создать трек',
              variant: 'destructive',
            });

            onTrackFailed?.(newTrack.id, newTrack.error_message);
          }

          // Track processing (from pending)
          if (oldTrack.status === 'pending' && newTrack.status === 'processing') {
            logInfo('Track processing started', 'useTrackSync', { trackId: newTrack.id });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logInfo('Track sync subscribed', 'useTrackSync');
        } else if (status === 'CHANNEL_ERROR') {
          logError('Track sync channel error', new Error('Channel error'), 'useTrackSync');
        } else if (status === 'TIMED_OUT') {
          logWarn('Track sync timed out', 'useTrackSync');
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        logInfo('Unsubscribing from track sync', 'useTrackSync');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, enabled, onTrackCompleted, onTrackFailed, toast]);

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

            toast({
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
  }, [userId, enabled, toast]);

  return {
    isSubscribed: channelRef.current !== null,
  };
};
