/**
 * Hook for manually synchronizing track status with provider
 * Allows users to recover tracks that completed but didn't update in UI
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';

interface ManualSyncParams {
  trackId: string;
}

interface ManualSyncResponse {
  success: boolean;
  action: string;
  message: string;
}

export const useManualSyncTrack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trackId }: ManualSyncParams) => {
      logger.info('🔄 Manual sync requested', undefined, { trackId });

      toast.loading('Синхронизация с провайдером...', {
        id: `sync-${trackId}`,
      });

      const { data, error } = await supabase.functions.invoke<ManualSyncResponse>(
        'check-stuck-tracks',
        {
          body: {
            trackIds: [trackId]
          }
        }
      );

      toast.dismiss(`sync-${trackId}`);

      if (error) {
        logger.error('Manual sync failed', error instanceof Error ? error : new Error(String(error)));
        throw new Error(error.message || 'Не удалось синхронизировать трек');
      }

      if (!data?.success) {
        throw new Error('Синхронизация не удалась');
      }

      logger.info('Manual sync completed', undefined, { trackId, action: data.action });

      return data;
    },

    onSuccess: (data) => {
      // Invalidate tracks queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tracks'] });

      if (data.action === 'synced_completed') {
        toast.success('✅ Трек восстановлен!', {
          description: 'Генерация была успешно завершена',
        });
      } else if (data.action === 'marked_failed') {
        toast.error('Генерация не удалась', {
          description: data.message || 'Провайдер сообщил об ошибке',
        });
      } else if (data.action === 'still_processing') {
        toast.info('Генерация в процессе', {
          description: 'Трек ещё создаётся, подождите',
        });
      } else {
        toast.info('Статус обновлён', {
          description: data.message || 'Проверка завершена',
        });
      }
    },

    onError: (error: Error) => {
      logger.error('Manual sync mutation error', error);
      
      Sentry.captureException(error, {
        tags: { 
          stage: 'manual_sync',
          errorType: error.name,
        },
        extra: {
          errorMessage: error.message,
          errorStack: error.stack,
        },
      });
      
      toast.error('Ошибка синхронизации', {
        description: error.message || 'Не удалось обновить статус трека',
      });
    },
  });
};
