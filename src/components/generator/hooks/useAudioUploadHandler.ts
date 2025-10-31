/**
 * Hook for handling audio file uploads and reference tracks
 */
import { useCallback } from 'react';
import { logger } from '@/utils/logger';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { UseGeneratorStateReturn } from './useGeneratorState';

export const useAudioUploadHandler = (state: UseGeneratorStateReturn) => {
  const { uploadAudio, isUploading } = useAudioUpload();
  const { toast } = useToast();

  const handleAudioFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      state.setPendingAudioFile(file);
      state.setAudioPreviewOpen(true);
    }
    e.target.value = '';
  }, [state]);

  const handleAudioConfirm = useCallback(async () => {
    if (!state.pendingAudioFile) return;

    const url = await uploadAudio(state.pendingAudioFile);
    if (url) {
      state.setParam('referenceAudioUrl', url);
      state.setParam('referenceFileName', state.pendingAudioFile.name);
      state.setMode('custom');
      state.setPendingAudioFile(null);
      toast({
        title: '🎵 Референс добавлен',
        description: 'Переключено на расширенный режим для настройки',
      });
    }
  }, [state, uploadAudio, toast]);

  const handleRemoveAudio = useCallback(() => {
    state.setParam('referenceAudioUrl', null);
    state.setParam('referenceFileName', null);
    state.setParam('referenceTrackId', null);
    state.setPendingAudioFile(null);
  }, [state]);

  const handleSelectReferenceTrack = useCallback((track: { id: string; audio_url: string; title: string }) => {
    state.setParam('referenceTrackId', track.id);
    state.setParam('referenceAudioUrl', track.audio_url);
    state.setParam('referenceFileName', track.title);
    state.setMode('custom');
    logger.info('Reference track selected', 'AudioUploadHandler', { trackId: track.id, title: track.title });
    toast({
      title: '🎵 Трек выбран',
      description: `Используется "${track.title}" как референс`,
    });
  }, [state, toast]);

  const handleManualAnalyze = useCallback(async (audioUrl: string) => {
    try {
      logger.info('🔍 [MANUAL-ANALYSIS] Starting analysis', 'AudioUploadHandler', {
        audioUrl: audioUrl.substring(0, 50)
      });

      const { data, error } = await supabase.functions.invoke('analyze-reference-audio', {
        body: { audioUrl }
      });

      if (error) throw error;

      logger.info('✅ [MANUAL-ANALYSIS] Analysis started', 'AudioUploadHandler', {
        recognitionId: data?.recognitionId,
        descriptionId: data?.descriptionId
      });

      toast({
        title: '🔍 Анализ запущен',
        description: 'Mureka обрабатывает аудио...',
      });
    } catch (error) {
      logger.error('[MANUAL-ANALYSIS] Failed to start analysis', error instanceof Error ? error : new Error(String(error)), 'AudioUploadHandler');
      toast({
        title: 'Ошибка анализа',
        description: 'Не удалось запустить анализ аудио',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const handleRecordComplete = useCallback(async (audioUrl: string) => {
    state.setParam('referenceAudioUrl', audioUrl);
    state.setParam('referenceFileName', 'Записанное аудио');
    state.setMode('custom');
    logger.info('Audio recorded', 'AudioUploadHandler', { audioUrl: audioUrl.substring(0, 50) });
    toast({
      title: '🎤 Запись завершена',
      description: 'Аудио добавлено как референс',
    });
  }, [state, toast]);

  return {
    isUploading,
    handleAudioFileSelect,
    handleAudioConfirm,
    handleRemoveAudio,
    handleSelectReferenceTrack,
    handleManualAnalyze,
    handleRecordComplete,
  };
};
