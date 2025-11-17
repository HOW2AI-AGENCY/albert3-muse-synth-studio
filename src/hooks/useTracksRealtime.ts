/**
 * ✅ ENHANCED: Realtime subscription layer for tracks
 * Automatically updates React Query cache on track changes
 * 
 * IMPROVEMENTS:
 * - Enhanced logging for debugging
 * - Proper cache invalidation strategy
 * - Handles track versions updates
 */

import { useQueryClient } from '@tanstack/react-query';
import type { Track } from '@/types/domain/track.types';
import { useRealtimeSubscription } from '../common/useRealtimeSubscription';
import { logger } from '@/utils/logger';
import { trackVersionsQueryKeys } from '@/features/tracks/api/trackVersions';

/**
 * Subscribe to track updates for current user
 */
export const useTracksRealtime = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  useRealtimeSubscription<Track>(
    `tracks-${userId}`,
    'tracks',
    userId ? `user_id=eq.${userId}` : '',
    (updatedTrack) => {
      logger.info('🔔 Track realtime update received', 'useTracksRealtime', {
        trackId: updatedTrack.id,
        status: updatedTrack.status,
        title: updatedTrack.title?.substring(0, 30),
        hasAudioUrl: !!updatedTrack.audio_url
      });

      // Update track in all queries
      queryClient.setQueryData<Track[]>(
        ['tracks'],
        (old) => {
          if (!old) return [updatedTrack];
          const index = old.findIndex(t => t.id === updatedTrack.id);
          if (index === -1) return [...old, updatedTrack];
          
          const updated = [...old];
          updated[index] = updatedTrack;
          return updated;
        }
      );

      // Update single track query
      queryClient.setQueryData(['track', updatedTrack.id], updatedTrack);

      // ✅ CRITICAL: Invalidate related queries to refresh versions
      if (updatedTrack.status === 'completed') {
        logger.info('Track completed - invalidating related queries', 'useTracksRealtime', {
          trackId: updatedTrack.id
        });
        
        queryClient.invalidateQueries({ 
          queryKey: trackVersionsQueryKeys.list(updatedTrack.id) 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['track-stems', updatedTrack.id] 
        });
      }
    }
  );
};
