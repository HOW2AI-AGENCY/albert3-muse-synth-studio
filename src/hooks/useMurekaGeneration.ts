/**
 * Hook for Mureka AI music generation
 * Provides interface for generating music with Mureka O1 System
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

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
}

export const useMurekaGeneration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MurekaGenerationParams) => {
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
      toast.success('Mureka генерация запущена!', {
        description: `Track ID: ${data.trackId}`,
      });

      // Invalidate tracks queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },

    onError: (error: Error) => {
      logger.error('Mureka generation mutation error', error);
      toast.error('Ошибка генерации', {
        description: error.message,
      });
    },
  });
};
