/**
 * Hook for Mureka AI track description and analysis
 * Provides AI-generated descriptions including genre, mood, tempo, instruments
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface DescribeSongParams {
  trackId: string;
}

interface DescribeSongResponse {
  success: boolean;
  descriptionId: string;
  taskId: string;
}

interface SongDescription {
  id: string;
  track_id: string;
  status: 'processing' | 'completed' | 'failed';
  ai_description?: string;
  detected_genre?: string;
  detected_mood?: string;
  tempo_bpm?: number;
  key_signature?: string;
  detected_instruments?: string[];
  energy_level?: number;
  danceability?: number;
  valence?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export const useDescribeSong = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DescribeSongParams) => {
      logger.info('Starting track description', undefined, {
        trackId: params.trackId,
      });

    const { data, error } = await supabase.functions.invoke<DescribeSongResponse>(
      'describe-song-replicate',
      {
        body: {
          trackId: params.trackId,
        },
      }
    );

      if (error) {
        logger.error('Track description failed', error instanceof Error ? error : new Error(String(error)));
        throw new Error(error.message || 'Failed to start description');
      }

      if (!data?.success) {
        throw new Error('Track description failed');
      }

      return data;
    },

    onSuccess: (data) => {
      toast.success('Анализ трека начат!', {
        description: 'AI анализирует музыку...',
      });

      queryClient.invalidateQueries({ queryKey: ['song-descriptions'] });
      queryClient.invalidateQueries({ 
        queryKey: ['song-description', data.descriptionId] 
      });
    },

    onError: (error: Error) => {
      logger.error('Track description mutation error', error);
      toast.error('Ошибка анализа', {
        description: error.message,
      });
    },
  });
};

/**
 * Query hook to fetch descriptions for a specific track
 */
export const useTrackDescriptions = (trackId?: string) => {
  return useQuery({
    queryKey: ['song-descriptions', trackId],
    queryFn: async () => {
      if (!trackId) return [];

      const { data, error } = await supabase
        .from('song_descriptions')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch track descriptions', error);
        throw error;
      }

      return data as SongDescription[];
    },
    enabled: !!trackId,
  });
};

/**
 * Query hook to fetch a specific description by ID
 */
export const useSongDescription = (descriptionId?: string) => {
  return useQuery({
    queryKey: ['song-description', descriptionId],
    queryFn: async () => {
      if (!descriptionId) return null;

      const { data, error } = await supabase
        .from('song_descriptions')
        .select('*')
        .eq('id', descriptionId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to fetch description', error);
        throw error;
      }

      return data as SongDescription | null;
    },
    enabled: !!descriptionId,
  });
};
