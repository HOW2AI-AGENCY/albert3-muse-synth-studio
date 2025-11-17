/**
 * Hook for Audio Upscaling with automatic version creation
 * Creates a "Remaster" version when upscale is completed
 * 
 * @version 1.0.0
 * @since 2025-11-17
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useAudioUpscale, useAudioUpscaleStatus } from './useAudioUpscale';

interface UseAudioUpscaleWithVersionParams {
  trackId: string;
  inputFileUrl: string;
  onComplete?: (versionId: string, outputUrl: string) => void;
}

export const useAudioUpscaleWithVersion = () => {
  const { mutate: startUpscale, isPending: isStarting } = useAudioUpscale();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const { data: jobStatus } = useAudioUpscaleStatus(activeJobId, !!activeJobId);

  const upscaleTrack = useCallback(async ({
    trackId,
    inputFileUrl,
  }: Omit<UseAudioUpscaleWithVersionParams, 'onComplete'>) => {
    try {
      logger.info('🎵 [UPSCALE] Starting audio upscale', 'useAudioUpscaleWithVersion', { trackId });

      setProgress(10);

      // Start upscale job
      const result = await new Promise<{ jobId: string; predictionId: string }>((resolve, reject) => {
        startUpscale({
          trackId,
          inputFileUrl,
          truncatedBatches: true,
          ddimSteps: 50,
          guidanceScale: 3.5,
          modelVersion: 'sakemin/audiosr-long-audio'
        }, {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error)
        });
      });

      setActiveJobId(result.jobId);
      setProgress(30);

      logger.info('✅ [UPSCALE] Job started', 'useAudioUpscaleWithVersion', { jobId: result.jobId });

      toast.success('Улучшение аудио началось! ⏳', {
        description: 'Это займет 1-2 минуты'
      });

    } catch (error) {
      logger.error('[UPSCALE] Failed to start', error as Error, 'useAudioUpscaleWithVersion');
      toast.error('Не удалось начать улучшение аудио');
      setProgress(0);
      setActiveJobId(null);
    }
  }, [startUpscale]);

  // Monitor job status and create version when complete
  useEffect(() => {
    if (!jobStatus || !activeJobId) return;

    const status = jobStatus.status;

    if (status === 'processing') {
      setProgress(60);
    } else if (status === 'completed' && jobStatus.output_audio_url) {
      setProgress(90);

      logger.info('✅ [UPSCALE] Job completed', 'useAudioUpscaleWithVersion', {
        jobId: activeJobId,
        outputUrl: jobStatus.output_audio_url
      });

      // Create "Remaster" version
      createRemasterVersion(jobStatus.track_id, jobStatus.output_audio_url, activeJobId);
    } else if (status === 'failed') {
      logger.error('[UPSCALE] Job failed', new Error(jobStatus.error_message || 'Unknown error'));
      toast.error('Ошибка улучшения аудио', {
        description: jobStatus.error_message || 'Попробуйте позже'
      });
      setProgress(0);
      setActiveJobId(null);
    }
  }, [jobStatus, activeJobId]);

  const createRemasterVersion = async (
    trackId: string,
    outputUrl: string,
    jobId: string
  ) => {
    try {
      // Get current track to determine next variant index
      const { data: existingVersions } = await supabase
        .from('track_versions')
        .select('variant_index')
        .eq('parent_track_id', trackId)
        .order('variant_index', { ascending: false })
        .limit(1);

      const nextIndex = (existingVersions?.[0]?.variant_index ?? -1) + 1;

      // Create remaster version
      const { data: newVersion, error: versionError } = await supabase
        .from('track_versions')
        .insert({
          parent_track_id: trackId,
          variant_index: nextIndex,
          audio_url: outputUrl,
          is_primary_variant: false,
          is_preferred_variant: false,
          metadata: {
            type: 'remaster',
            source: 'audio-upscale',
            upscale_job_id: jobId,
            model: 'sakemin/audiosr-long-audio',
            sample_rate: '48kHz',
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (versionError) throw versionError;

      logger.info('✅ [UPSCALE] Remaster version created', 'useAudioUpscaleWithVersion', {
        versionId: newVersion.id,
        trackId,
        variantIndex: nextIndex
      });

      setProgress(100);

      toast.success('🎧 Ремастер готов!', {
        description: 'Улучшенная версия добавлена к треку'
      });

      setTimeout(() => {
        setProgress(0);
        setActiveJobId(null);
      }, 1000);

    } catch (error) {
      logger.error('[UPSCALE] Failed to create version', error as Error, 'useAudioUpscaleWithVersion');
      toast.error('Не удалось создать ремастер-версию');
      setProgress(0);
      setActiveJobId(null);
    }
  };

  return {
    upscaleTrack,
    isUpscaling: isStarting || !!activeJobId,
    progress,
    activeJobId,
    jobStatus
  };
};
