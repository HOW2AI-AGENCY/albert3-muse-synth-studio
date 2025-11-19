/**
 * Hook for Mureka AI song recognition (Shazam-like)
 * Identifies songs from audio files
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface RecognizeSongParams {
  audioFileUrl: string;
  trackId?: string;
}

interface RecognizeSongResponse {
  success: boolean;
  recognitionId: string;
  taskId: string;
}

interface SongRecognition {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  recognized_title?: string;
  recognized_artist?: string;
  recognized_album?: string;
  release_date?: string;
  confidence_score?: number;
  external_ids?: Record<string, any>;
  error_message?: string;
  created_at: string;
}

export const useRecognizeSong = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecognizeSongParams) => {
      logger.info('Starting song recognition', undefined, {
        audioUrl: params.audioFileUrl,
      });

      const { data, error } = await SupabaseFunctions.invoke<RecognizeSongResponse>(
        'recognize-song',
        {
          body: {
            audioFileUrl: params.audioFileUrl,
            trackId: params.trackId,
          },
        }
      );

      if (error) {
        logger.error('Song recognition failed', error instanceof Error ? error : new Error(String(error)));
        throw new Error(error.message || 'Failed to start recognition');
      }

      if (!data?.success) {
        throw new Error('Song recognition failed');
      }

      return data;
    },

    onSuccess: () => {
      toast.success('Распознавание начато!', {
        description: 'Анализируем трек...',
      });

      queryClient.invalidateQueries({ queryKey: ['song-recognitions'] });
    },

    onError: (error: Error) => {
      logger.error('Song recognition mutation error', error);
      toast.error('Ошибка распознавания', {
        description: error.message,
      });
    },
  });
};

/**
 * Query hook to fetch user's song recognitions
 */
export const useSongRecognitions = () => {
  return useQuery({
    queryKey: ['song-recognitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('song_recognitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch recognitions', error);
        throw error;
      }

      return data as SongRecognition[];
    },
  });
};

/**
 * Query hook to fetch a specific recognition by ID
 */
export const useSongRecognition = (recognitionId?: string) => {
  return useQuery({
    queryKey: ['song-recognition', recognitionId],
    queryFn: async () => {
      if (!recognitionId) return null;

      const { data, error } = await supabase
        .from('song_recognitions')
        .select('*')
        .eq('id', recognitionId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to fetch recognition', error);
        throw error;
      }

      return data as SongRecognition | null;
    },
    enabled: !!recognitionId,
  });
};
