/**
 * Hook for extending lyrics using Mureka AI
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface ExtendLyricsParams {
  existingLyrics: string;
  prompt?: string;
  targetLength?: number;
}

interface ExtendLyricsResponse {
  success: boolean;
  taskId: string;
  lyrics: string;
}

export const useExtendLyricsMureka = () => {
  return useMutation({
    mutationFn: async (params: ExtendLyricsParams) => {
      logger.info('Extending lyrics with Mureka', undefined, {
        existingLength: params.existingLyrics.length,
        targetLength: params.targetLength,
      });

      const { data, error } = await supabase.functions.invoke<ExtendLyricsResponse>(
        'extend-lyrics-mureka',
        {
          body: {
            existingLyrics: params.existingLyrics,
            prompt: params.prompt,
            targetLength: params.targetLength,
          },
        }
      );

      if (error) {
        logger.error('Lyrics extension failed', error instanceof Error ? error : new Error(String(error)));
        throw new Error(error.message || 'Failed to extend lyrics');
      }

      if (!data?.success) {
        throw new Error('Lyrics extension failed');
      }

      logger.info('Lyrics extended', undefined, {
        newLength: data.lyrics.length,
      });

      return data;
    },

    onSuccess: (data) => {
      toast.success('Текст продолжен!', {
        description: `Добавлено ${data.lyrics.length} символов`,
      });
    },

    onError: (error: Error) => {
      logger.error('Lyrics extension mutation error', error);
      toast.error('Ошибка продолжения текста', {
        description: error.message,
      });
    },
  });
};
