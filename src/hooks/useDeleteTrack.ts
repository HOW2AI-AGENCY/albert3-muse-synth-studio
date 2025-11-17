/**
 * Hook for deleting tracks
 * Handles track deletion with confirmation
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      console.error('Delete track error:', error);
      toast.error('Ошибка при удалении трека');
    }
  });

  const deleteTrack = useCallback(
    (trackId: string) => {
      if (confirm('Вы уверены, что хотите удалить этот трек?')) {
        mutation.mutate(trackId);
      }
    },
    [mutation]
  );

  return {
    deleteTrack,
    isLoading: mutation.isPending
  };
};
