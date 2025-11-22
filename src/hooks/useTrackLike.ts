/**
 * Hook for liking/unliking tracks
 * Handles optimistic updates and error recovery
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useTrackLike = () => {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('track_likes')
        .insert({ track_id: trackId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: (_, trackId) => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      queryClient.invalidateQueries({ queryKey: ['track-likes'] });
    },
    onError: (error: Error) => {
      logger.error('Like track error', error, 'useTrackLike');
      toast.error('Не удалось добавить в избранное');
    }
  });

  const unlikeMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('track_likes')
        .delete()
        .eq('track_id', trackId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, trackId) => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      queryClient.invalidateQueries({ queryKey: ['track-likes'] });
    },
    onError: (error: Error) => {
      logger.error('Unlike track error', error, 'useTrackLike');
      toast.error('Не удалось убрать из избранного');
    }
  });

  const likeTrack = useCallback((trackId: string) => {
    likeMutation.mutate(trackId);
  }, [likeMutation]);

  const unlikeTrack = useCallback((trackId: string) => {
    unlikeMutation.mutate(trackId);
  }, [unlikeMutation]);

  return {
    likeTrack,
    unlikeTrack,
    isLiking: likeMutation.isPending,
    isUnliking: unlikeMutation.isPending
  };
};
