/**
 * useResyncTrack Hook
 * 
 * Ресинхронизация данных трека из Suno API
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface ResyncTrackParams {
  trackId: string;
  force?: boolean;
}

export const useResyncTrack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trackId, force = false }: ResyncTrackParams) => {
      logger.info('Starting track resync', 'useResyncTrack', { trackId, force });

      const { data, error } = await SupabaseFunctions.invoke('resync-track-data', {
        body: { trackId, force },
      });

      if (error) {
        logger.error('Resync failed', error, 'useResyncTrack', { trackId });
        
        // Parse error message if it's from Edge Function
        const errorData = typeof error === 'object' && error !== null ? error as any : null;
        const statusCode = errorData?.context?.statusCode || errorData?.statusCode;
        
        // Create user-friendly error
        const userError = new Error(
          errorData?.message || 
          errorData?.error || 
          error.message || 
          'Не удалось обновить данные трека'
        );
        (userError as any).statusCode = statusCode;
        (userError as any).details = errorData;
        
        throw userError;
      }

      return data;
    },
    onSuccess: (data, { trackId }) => {
      logger.info('Resync completed', 'useResyncTrack', { trackId, data });

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      queryClient.invalidateQueries({ queryKey: ['track-versions', trackId] });
      queryClient.invalidateQueries({ queryKey: ['track-stems', trackId] });

      const typedData = data as any;
      toast.success('Данные трека обновлены', {
        description: `Синхронизировано версий: ${typedData?.variantsCount || 1}`,
      });
    },
    onError: (error: any, { trackId }) => {
      logger.error('Resync error', error, 'useResyncTrack', { trackId });
      
      // Show user-friendly message based on status code
      if (error?.statusCode === 404) {
        toast.error('Данные недоступны', {
          description: 'Этот трек слишком старый - данные генерации уже удалены из Suno API. Обновление невозможно.',
          duration: 5000,
        });
      } else {
        toast.error('Ошибка синхронизации', {
          description: error.message || 'Не удалось обновить данные трека. Попробуйте позже.',
        });
      }
    },
  });
};
