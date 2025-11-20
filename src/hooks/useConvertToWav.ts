import { useState, useCallback } from 'react';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import type { WavConversionResponse } from '@/types/edge-functions';

interface ConvertToWavOptions {
  trackId: string;
  audioId?: string;
}

export const useConvertToWav = () => {
  const [isConverting, setIsConverting] = useState(false);
  const [convertingTrackId, setConvertingTrackId] = useState<string | null>(null);
  const { toast } = useToast();

  const convertToWav = useCallback(async ({ trackId, audioId }: ConvertToWavOptions) => {
    setIsConverting(true);
    setConvertingTrackId(trackId);

    try {
      logger.info('Starting WAV conversion', 'useConvertToWav', { trackId, audioId });

      const { data, error } = await SupabaseFunctions.invoke<WavConversionResponse>('convert-to-wav', {
        body: { trackId, audioId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to start WAV conversion');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      logger.info('WAV conversion started', 'useConvertToWav', { 
        trackId, 
        jobId: data?.jobId, 
        sunoTaskId: data?.sunoTaskId 
      });

      // ✅ Phase 3: WAV Conversion Tracking
      import('@/services/analytics.service').then(({ AnalyticsService }) => {
        AnalyticsService.recordEvent({
          eventType: 'wav_conversion_started',
          trackId,
          metadata: {
            audioId: audioId || null,
            jobId: data?.jobId || '',
            sunoTaskId: data?.sunoTaskId || '',
          },
        });
      });

      toast({
        title: "Конвертация начата",
        description: "Ваш трек конвертируется в WAV формат. Это займет 1-3 минуты.",
      });

      return {
        success: true,
        jobId: data?.jobId || '',
        sunoTaskId: data?.sunoTaskId || '',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('WAV conversion failed', error instanceof Error ? error : new Error(String(error)), 'useConvertToWav', { trackId });

      // ✅ Phase 3: WAV Conversion Error Tracking
      import('@/services/analytics.service').then(({ AnalyticsService }) => {
        AnalyticsService.recordEvent({
          eventType: 'wav_conversion_failed',
          trackId,
          metadata: {
            audioId: audioId || null,
            errorMessage: message,
          },
        });
      });

      toast({
        title: "Ошибка конвертации",
        description: message,
        variant: "destructive",
      });

      return { success: false, error: message };
    } finally {
      setIsConverting(false);
      setConvertingTrackId(null);
    }
  }, [toast]);

  const downloadWav = useCallback(async (wavUrl: string, trackTitle: string) => {
    try {
      const response = await fetch(wavUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trackTitle}.wav`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Скачивание начато",
        description: `${trackTitle}.wav`,
      });
    } catch (error) {
      logger.error('Failed to download WAV', error instanceof Error ? error : new Error(String(error)), 'useConvertToWav', { wavUrl });
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось скачать WAV файл",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    convertToWav,
    downloadWav,
    isConverting,
    convertingTrackId,
  };
};
