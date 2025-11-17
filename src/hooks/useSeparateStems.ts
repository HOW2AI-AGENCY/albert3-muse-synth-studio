/**
 * Hook for track stem separation
 * Handles splitting tracks into vocals/instrumental or 12 stems
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SeparateStemsParams {
  trackId: string;
  separationMode?: 'separate_vocal' | 'split_stem';
}

export const useSeparateStems = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ trackId, separationMode = 'split_stem' }: SeparateStemsParams) => {
      const { data, error } = await supabase.functions.invoke('separate-stems', {
        body: { trackId, separationMode }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { trackId }) => {
      toast.success('Разделение на стемы начато');
      // Invalidate queries to refresh track data
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
    },
    onError: (error: Error) => {
      console.error('Stem separation error:', error);
      toast.error('Ошибка при разделении на стемы');
    }
  });

  const separateStems = useCallback(
    (trackId: string, separationMode?: 'separate_vocal' | 'split_stem') => {
      mutation.mutate({ trackId, separationMode });
    },
    [mutation]
  );

  return {
    separateStems,
    isLoading: mutation.isPending
  };
};
