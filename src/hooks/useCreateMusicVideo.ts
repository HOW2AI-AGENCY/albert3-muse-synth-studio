/**
 * Hook for creating music videos
 * Generates MP4 videos with visualizations for tracks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logInfo, logError } from '@/utils/logger';

interface CreateMusicVideoParams {
  trackId: string;
  audioId: string;
  author?: string;
  domainName?: string;
}

interface CreateMusicVideoResponse {
  success: boolean;
  taskId: string;
  message?: string;
}

export const useCreateMusicVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateMusicVideoParams) => {
      logInfo('Creating music video', 'useCreateMusicVideo', { params });

      const { data, error } = await supabase.functions.invoke('create-music-video', {
        body: params
      });

      if (error) {
        logError('Failed to create music video', error, 'useCreateMusicVideo', { params });
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create music video');
      }

      return data as CreateMusicVideoResponse;
    },

    onSuccess: (data, variables) => {
      logInfo('Music video generation started', 'useCreateMusicVideo', {
        trackId: variables.trackId,
        taskId: data.taskId
      });

      toast.success('Создание видео начато', {
        description: 'Вы получите уведомление когда видео будет готово'
      });

      // Invalidate track query to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['track', variables.trackId] 
      });

      queryClient.invalidateQueries({
        queryKey: ['tracks']
      });
    },

    onError: (error: Error) => {
      logError('Music video creation failed', error, 'useCreateMusicVideo');

      if (error.message.includes('Rate limit')) {
        toast.error('Превышен лимит запросов', {
          description: 'Пожалуйста, попробуйте позже'
        });
      } else if (error.message.includes('already exists')) {
        toast.info('Видео уже существует', {
          description: 'Видео уже создано для этого трека'
        });
      } else if (error.message.includes('Unauthorized')) {
        toast.error('Ошибка доступа', {
          description: 'У вас нет прав на создание видео для этого трека'
        });
      } else {
        toast.error('Ошибка создания видео', {
          description: error.message || 'Попробуйте позже'
        });
      }
    }
  });
};