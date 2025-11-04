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
    onSuccess: (_, trackId) => {
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: ({ trackId, isLiked }: { trackId: string; isLiked: boolean }) =>
      isLiked
        ? repository.decrementLikeCount(trackId)
        : repository.incrementLikeCount(trackId),
    onSuccess: (_, { trackId }) => {
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
