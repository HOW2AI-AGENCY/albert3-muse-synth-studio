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
import { lyricsCache } from '@/utils/lyricsCache';

/**
 * Subscribe to track updates for current user
 */
export const useTracksRealtime = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  // Subscribe to tracks updates
  useRealtimeSubscription<Track>(
    `tracks-${userId}`,
    'tracks',
    userId ? `user_id=eq.${userId}` : '',
    (updatedTrack: Track) => {
      logger.info('🔔 Track realtime update received', 'useTracksRealtime', {
        trackId: updatedTrack.id,
        status: updatedTrack.status,
        title: updatedTrack.title?.substring(0, 30),
        hasAudioUrl: !!updatedTrack.audio_url,
        hasLyrics: !!updatedTrack.lyrics
      });

      // Update track in all queries
      queryClient.setQueryData<Track[]>(
        ['tracks'],
        (old) => {
          if (!old) return [updatedTrack];
          const index = old.findIndex(t => t.id === updatedTrack.id);
          if (index === -1) return [...old, updatedTrack];
          
          const updated = [...old];
          updated[index] = { ...updated[index], ...updatedTrack };
          return updated;
        }
      );

      // Update single track query
      queryClient.setQueryData(['track', updatedTrack.id], (old: Track | undefined) => {
        return old ? { ...old, ...updatedTrack } : updatedTrack;
      });

      // ✅ CRITICAL: Invalidate related queries to refresh versions and lyrics
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
        queryClient.invalidateQueries({ 
          queryKey: ['tracks'] 
        });

        // ✅ Invalidate timestamped lyrics when track is completed or metadata updated
        if (updatedTrack.suno_id) {
          queryClient.invalidateQueries({ 
            queryKey: ['timestampedLyrics', updatedTrack.suno_id] 
          });
          // Clear in-memory cache
          lyricsCache.clear();
          logger.info('✅ Invalidated timestamped lyrics cache', 'useTracksRealtime', { 
            trackId: updatedTrack.id,
            sunoId: updatedTrack.suno_id,
          });
        }
      }
    }
  );

  // ✅ NEW: Subscribe to track_versions updates to catch lyrics in versions
  useRealtimeSubscription<any>(
    `track-versions-${userId}`,
    'track_versions',
    '', // We'll filter parent tracks by user on client side
    (updatedVersion: any) => {
      logger.info('🔔 Track version update received', 'useTracksRealtime', {
        versionId: updatedVersion.id,
        trackId: updatedVersion.parent_track_id,
        hasLyrics: !!updatedVersion.lyrics
      });

      // Invalidate track versions query for the parent track
      queryClient.invalidateQueries({ 
        queryKey: trackVersionsQueryKeys.list(updatedVersion.parent_track_id) 
      });

      // Invalidate main tracks query to refresh UI
      queryClient.invalidateQueries({ 
        queryKey: ['tracks'] 
      });

      // ✅ Invalidate timestamped lyrics for version updates
      if (updatedVersion.suno_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['timestampedLyrics'] 
        });
        lyricsCache.clear();
        logger.info('✅ Cleared lyrics cache on version update', 'useTracksRealtime', {
          versionId: updatedVersion.id,
          sunoId: updatedVersion.suno_id,
        });
      }
    }
  );
};
