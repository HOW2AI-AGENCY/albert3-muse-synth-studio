/**
 * Hook for AudioSR upscaling
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface AudioUpscaleParams {
  trackId?: string;
  inputFileUrl: string;
  truncatedBatches?: boolean;
  ddimSteps?: number;
  guidanceScale?: number;
  seed?: number;
  modelVersion?: 'sakemin/audiosr-long-audio' | 'nateraw/audio-super-resolution';
}

export interface AudioUpscaleResult {
  success: boolean;
  jobId: string;
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
    onSuccess: (data) => {
      toast.success('Audio upscaling started! ⏳', {
        description: `Job ID: ${data.jobId}`
      });
    },
    onError: (error: Error) => {
      logger.error('Audio upscale failed', error, 'useAudioUpscale');
      toast.error(error.message || 'Failed to upscale audio');
    }
  });
};

export const useAudioUpscaleStatus = (jobId: string | null, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['audio-upscale-status', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('No job ID');

      const { data, error } = await supabase.functions.invoke('upscale-audio-sr', {
        body: { jobId }
      });

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 3000; // Poll every 3 seconds
    }
  });
};

export const useAudioUpscaleJobs = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['audio-upscale-jobs', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('audio_upscale_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });
};
