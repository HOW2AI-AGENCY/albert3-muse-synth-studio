/**
 * Hook for Mureka AI music generation
 * Provides interface for generating music with Mureka O1 System
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';

interface MurekaGenerationParams {
  trackId?: string;
  title?: string;
  prompt: string;
  lyrics?: string;
  styleTags?: string[];
  hasVocals?: boolean;
  isBGM?: boolean;
  modelVersion?: string;
  idempotencyKey?: string;
}

interface MurekaGenerationResponse {
  success: boolean;
  taskId: string;
  trackId: string;
  message: string;
  requiresLyricsSelection?: boolean;
  jobId?: string;
}

export const useMurekaGeneration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MurekaGenerationParams) => {
      // ✅ TASK B: Показываем 2-stage прогресс
      if (!params.lyrics || params.lyrics.trim().length === 0) {
        toast.loading('🎼 Этап 1/2: Генерация текста песни...', {
          id: 'mureka-lyrics-stage',
        });
      } else {
        toast.loading('🎵 Создаём музыку...', {
          id: 'mureka-generation',
        });
      }

      logger.info('Starting Mureka generation', undefined, { 
        promptLength: params.prompt.length,
        hasLyrics: !!params.lyrics,
        isBGM: params.isBGM,
      });

      const { data, error } = await supabase.functions.invoke<MurekaGenerationResponse>(
        'generate-mureka',
        {
          body: {
            trackId: params.trackId,
            title: params.title,
            prompt: params.prompt,
            lyrics: params.lyrics,
            styleTags: params.styleTags,
            hasVocals: params.hasVocals,
            isBGM: params.isBGM,
            modelVersion: params.modelVersion,
            idempotencyKey: params.idempotencyKey,
          },
        }
      );

      // Dismiss loading toasts
      toast.dismiss('mureka-lyrics-stage');
      toast.dismiss('mureka-generation');

      if (error) {
        logger.error('Mureka generation failed', error instanceof Error ? error : new Error(String(error)));
        throw new Error(error.message || 'Failed to start Mureka generation');
      }

      if (!data?.success) {
        throw new Error('Mureka generation failed');
      }

      logger.info('Mureka generation started', undefined, {
        taskId: data.taskId,
        trackId: data.trackId,
      });

      return data;
    },

    onSuccess: (data) => {
      if (data?.requiresLyricsSelection) {
        toast.message('Выберите вариант текста', {
          description: 'Откройте список вариантов и подтвердите один из них',
          duration: 6000,
        });
        Sentry.addBreadcrumb({ category: 'mureka', message: 'Lyrics variants available', level: 'info', data: { jobId: data.jobId } });
        // Обновим связанные запросы
        queryClient.invalidateQueries({ queryKey: ['lyrics_jobs', data.jobId] });
        queryClient.invalidateQueries({ queryKey: ['tracks'] });
        return;
      }

      toast.success('🎵 Генерация началась!', {
        description: 'Ваш трек создаётся. Примерное время: ~2 минуты',
        duration: 5000,
      });

      // Invalidate tracks queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },

    onError: (error: Error) => {
      logger.error('Mureka generation mutation error', error);
      
      // Capture to Sentry with full context
      Sentry.captureException(error, {
        tags: { 
          provider: 'mureka',
          stage: 'generation_hook',
          errorType: error.name,
        },
        extra: {
          errorMessage: error.message,
          errorStack: error.stack,
        },
      });
      
      toast.error('Ошибка генерации музыки', {
        description: error.message || 'Не удалось создать трек с помощью Mureka AI',
      });
    },
  });
};
