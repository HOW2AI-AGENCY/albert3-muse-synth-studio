/**
 * Hook for MiniMax Music-1.5 generation
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { useMutation } from '@tanstack/react-query';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import type { EdgeFunctionResponse } from '@/types/edge-functions';

export interface MinimaxGenerationParams {
  prompt: string;
  lyrics: string;
  referenceAudioUrl?: string;
  styleStrength?: number;
  sampleRate?: number;
  bitrate?: number;
  audioFormat?: 'mp3' | 'wav';
}

export interface MinimaxGenerationResult {
  success: boolean;
  audioUrl: string;
  prompt: string;
  lyrics: string;
}

export const useMinimaxGeneration = () => {
  return useMutation({
    mutationFn: async (params: MinimaxGenerationParams) => {
      const { data, error } = await SupabaseFunctions.invoke<EdgeFunctionResponse<MinimaxGenerationResult>>('generate-minimax', {
        body: params
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');

      return (data.data || data) as MinimaxGenerationResult;
    },
    onSuccess: () => {
      toast.success('Music generated successfully! 🎵');
    },
    onError: (error: Error) => {
      logger.error('Minimax generation failed', error, 'useMinimaxGeneration');
      toast.error(error.message || 'Failed to generate music');
    }
  });
};
