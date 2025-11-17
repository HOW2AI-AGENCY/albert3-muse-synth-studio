/**
 * Hook for AI track description (Mureka only)
 * Analyzes track and provides AI-generated description
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDescribeTrack = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { data, error } = await supabase.functions.invoke('describe-song', {
        body: { trackId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('AI-анализ трека начат');
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
    onError: (error: Error) => {
      console.error('Describe track error:', error);
      toast.error('Ошибка при анализе трека');
    }
  });

  const describeTrack = useCallback(
    (trackId: string) => {
      mutation.mutate(trackId);
    },
    [mutation]
  );

  return {
    describeTrack,
    isLoading: mutation.isPending
  };
};
