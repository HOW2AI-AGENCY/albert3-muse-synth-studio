/**
 * CRUD operations layer for tracks
 * Handles mutations with React Query
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getTrackRepository } from '@/repositories';
import type { Track } from '@/types/domain/track.types';
import { logger } from '@/utils/logger';

/**
 * Track mutation operations (create, update, delete)
 */
export const useTracksMutations = () => {
  const queryClient = useQueryClient();
  const repository = getTrackRepository();

  const deleteTrack = useMutation({
    mutationFn: (trackId: string) => repository.delete(trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast.success('Трек удалён');
    },
    onError: (error) => {
      logger.error('Delete track failed', error instanceof Error ? error : undefined, 'useTracksMutations');
      toast.error('Ошибка при удалении трека');
    },
  });

  const updateTrack = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Track> }) =>
      repository.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast.success('Трек обновлён');
    },
    onError: (error) => {
      logger.error('Update track failed', error instanceof Error ? error : undefined, 'useTracksMutations');
      toast.error('Ошибка при обновлении трека');
    },
  });

  const incrementPlayCount = useMutation({
    mutationFn: (trackId: string) => repository.incrementPlayCount(trackId),
    // PERF-002: Optimistic update for instant UI feedback
    onMutate: async (trackId) => {
      // Cancel ongoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['track', trackId] });
      await queryClient.cancelQueries({ queryKey: ['tracks'] });

      // Snapshot previous state for rollback
      const previousTrack = queryClient.getQueryData(['track', trackId]);
      const previousTracks = queryClient.getQueryData(['tracks']);

      // Optimistically update single track
      queryClient.setQueryData(['track', trackId], (old: Track | undefined) => {
        if (!old) return old;
        return {
          ...old,
          play_count: (old.play_count ?? 0) + 1,
        };
      });

      // Optimistically update tracks list
      queryClient.setQueryData(['tracks'], (old: Track[] | undefined) => {
        if (!old) return old;
        return old.map((track) =>
          track.id === trackId
            ? { ...track, play_count: (track.play_count ?? 0) + 1 }
            : track
        );
      });

      return { previousTrack, previousTracks };
    },
    onError: (error, trackId, context) => {
      // Rollback on error
      if (context?.previousTrack) {
        queryClient.setQueryData(['track', trackId], context.previousTrack);
      }
      if (context?.previousTracks) {
        queryClient.setQueryData(['tracks'], context.previousTracks);
      }
      logger.error('Increment play count failed', error instanceof Error ? error : undefined, 'useTracksMutations');
    },
    onSettled: (_data, _error, trackId) => {
      // Refetch to ensure consistency with server state
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: ({ trackId, isLiked }: { trackId: string; isLiked: boolean }) =>
      isLiked
        ? repository.decrementLikeCount(trackId)
        : repository.incrementLikeCount(trackId),
    // PERF-002: Optimistic update for instant UI feedback
    onMutate: async ({ trackId, isLiked }) => {
      // Cancel ongoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['track', trackId] });
      await queryClient.cancelQueries({ queryKey: ['tracks'] });

      // Snapshot previous state for rollback
      const previousTrack = queryClient.getQueryData(['track', trackId]);
      const previousTracks = queryClient.getQueryData(['tracks']);

      const delta = isLiked ? -1 : 1;

      // Optimistically update single track
      queryClient.setQueryData(['track', trackId], (old: Track | undefined) => {
        if (!old) return old;
        return {
          ...old,
          like_count: Math.max(0, (old.like_count ?? 0) + delta),
        };
      });

      // Optimistically update tracks list
      queryClient.setQueryData(['tracks'], (old: Track[] | undefined) => {
        if (!old) return old;
        return old.map((track) =>
          track.id === trackId
            ? { ...track, like_count: Math.max(0, (track.like_count ?? 0) + delta) }
            : track
        );
      });

      return { previousTrack, previousTracks };
    },
    onError: (error, { trackId }, context) => {
      // Rollback on error
      if (context?.previousTrack) {
        queryClient.setQueryData(['track', trackId], context.previousTrack);
      }
      if (context?.previousTracks) {
        queryClient.setQueryData(['tracks'], context.previousTracks);
      }
      logger.error('Toggle like failed', error instanceof Error ? error : undefined, 'useTracksMutations');
      toast.error('Не удалось изменить статус лайка');
    },
    onSettled: (_data, _error, { trackId }) => {
      // Refetch to ensure consistency with server state
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
  });

  return {
    deleteTrack: deleteTrack.mutate,
    updateTrack: updateTrack.mutate,
    incrementPlayCount: incrementPlayCount.mutate,
    toggleLike: toggleLike.mutate,
    isDeleting: deleteTrack.isPending,
    isUpdating: updateTrack.isPending,
  };
};
