/**
 * Hook for retrying failed track generation
 * Re-attempts generation for failed tracks
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// @ts-expect-error - supabase client for future direct queries
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useRetryTrack = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { data, error } = await SupabaseFunctions.invoke('retry-failed-tracks', {
        body: { trackId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Повторная генерация начата');
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
    onError: (error: Error) => {
      logger.error('Retry track error', error, 'useRetryTrack');
      toast.error('Ошибка при повторной генерации');
    }
  });

  const retryTrack = useCallback(
    (trackId: string) => {
      mutation.mutate(trackId);
    },
    [mutation]
  );

  return {
    retryTrack,
    isLoading: mutation.isPending
  };
};
