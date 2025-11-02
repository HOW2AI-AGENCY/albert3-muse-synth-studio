/**
 * Hook for AudioSR upscaling
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AudioUpscaleParams {
  inputFileUrl: string;
  truncatedBatches?: boolean;
  ddimSteps?: number;
  guidanceScale?: number;
  seed?: number;
}

export interface AudioUpscaleResult {
  success: boolean;
  predictionId: string;
  status: string;
}

export const useAudioUpscale = () => {
  return useMutation({
    mutationFn: async (params: AudioUpscaleParams) => {
      const { data, error } = await supabase.functions.invoke('upscale-audio-sr', {
        body: params
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Upscale failed');

      return data as AudioUpscaleResult;
    },
    onSuccess: () => {
      toast.success('Audio upscaling started! ⏳');
    },
    onError: (error: Error) => {
      console.error('[useAudioUpscale] Error:', error);
      toast.error(error.message || 'Failed to upscale audio');
    }
  });
};

export const useAudioUpscaleStatus = (predictionId: string | null, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['audio-upscale-status', predictionId],
    queryFn: async () => {
      if (!predictionId) throw new Error('No prediction ID');

      const { data, error } = await supabase.functions.invoke('upscale-audio-sr', {
        body: { predictionId }
      });

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!predictionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when completed or failed
      if (data?.status === 'succeeded' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    }
  });
};
