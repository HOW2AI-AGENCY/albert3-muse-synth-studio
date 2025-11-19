/**
 * Hook for manually synchronizing track status with provider
 * Allows users to recover tracks that completed but didn't update in UI
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
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

      // ✅ FIX: Check if track is stuck without task_id
      const { data: trackData } = await supabase
        .from('tracks')
        .select('id, status, created_at, mureka_task_id, provider')
        .eq('id', trackId)
        .single();

      if (trackData) {
        const ageMinutes = (Date.now() - new Date(trackData.created_at).getTime()) / (1000 * 60);
        const taskId = trackData.mureka_task_id;

        // ✅ If no task_id and older than 3 minutes → mark as failed
        if (!taskId && ageMinutes > 3 && (trackData.status === 'pending' || trackData.status === 'processing')) {
          logger.warn('Track stuck without task_id, marking as failed', undefined, { trackId, ageMinutes });
          
          await supabase
            .from('tracks')
            .update({
              status: 'failed',
              error_message: 'Генерация не началась (нет task_id). Попробуйте ещё раз.',
            })
            .eq('id', trackId);

          toast.dismiss(`sync-${trackId}`);
          
          return {
            success: true,
            action: 'marked_failed',
            message: 'Трек помечен как неудачный. Нажмите "Повторить" для новой попытки.',
          };
        }
      }

      const { data, error } = await SupabaseFunctions.invoke<ManualSyncResponse>(
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
