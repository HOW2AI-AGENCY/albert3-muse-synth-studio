/**
 * Realtime subscription layer for tracks
 * Automatically updates React Query cache on track changes
 */

import { useQueryClient } from '@tanstack/react-query';
import type { Track } from '@/types/domain/track.types';
import { useRealtimeSubscription } from '../common/useRealtimeSubscription';

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

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['track-versions', updatedTrack.id] });
      queryClient.invalidateQueries({ queryKey: ['track-stems', updatedTrack.id] });
    }
  );
};
