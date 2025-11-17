/**
 * useResyncTrack Hook
 * 
 * Ресинхронизация данных трека из Suno API
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      const { data, error } = await supabase.functions.invoke('resync-track-data', {
        body: { trackId, force },
      });

      if (error) {
        logger.error('Resync failed', error, 'useResyncTrack', { trackId });
        throw error;
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

      toast.success('Данные трека обновлены', {
        description: `Синхронизировано версий: ${data.variantsCount}`,
      });
    },
    onError: (error: Error, { trackId }) => {
      logger.error('Resync error', error, 'useResyncTrack', { trackId });
      toast.error('Ошибка синхронизации', {
        description: error.message || 'Не удалось обновить данные трека',
      });
    },
  });
};
