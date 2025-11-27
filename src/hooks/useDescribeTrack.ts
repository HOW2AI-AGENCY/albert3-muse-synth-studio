/**
 * Hook for AI track description (Mureka only)
 * Analyzes track and provides AI-generated description
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// @ts-expect-error - supabase client for future direct queries
 
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useDescribeTrack = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (trackId: string) => {
      const { data, error } = await SupabaseFunctions.invoke('describe-song', {
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
      logger.error('Describe track error', error, 'useDescribeTrack');
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
