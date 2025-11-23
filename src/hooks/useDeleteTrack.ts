/**
 * Hook for deleting tracks
 * Handles track deletion with confirmation
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useDeleteTrack = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Трек удален');
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
    onError: (error: Error) => {
      logger.error('Delete track error:', error, 'useDeleteTrack');
      toast.error('Ошибка при удалении трека');
    }
  });

  return {
    deleteTrack: mutation.mutate,
    isLoading: mutation.isPending,
  };
};
