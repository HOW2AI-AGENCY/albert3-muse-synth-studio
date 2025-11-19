/**
 * Hook for handling audio file uploads and reference tracks
 */
import { useCallback } from 'react';
import { logger } from '@/utils/logger';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
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

    const result = await uploadAudio(state.pendingAudioFile);
    if (result?.publicUrl) {
      state.setParam('referenceAudioUrl', result.publicUrl);
      state.setParam('referenceFileName', state.pendingAudioFile.name);
      state.setMode('custom');
      state.setPendingAudioFile(null);
      
      toast({
        title: '🎵 Референс добавлен',
        description: 'Запускаем анализ аудио...',
      });

      // Автоматический анализ после загрузки
      if (result.libraryId) {
        await handleManualAnalyze(result.publicUrl, result.libraryId);
      }
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

  const handleManualAnalyze = useCallback(async (audioUrl: string, audioLibraryId?: string) => {
    try {
      logger.info('🔍 [MANUAL-ANALYSIS] Starting analysis', 'AudioUploadHandler', {
        audioUrl: audioUrl.substring(0, 50),
        audioLibraryId: audioLibraryId ?? 'null'
      });

      // ✅ Получаем токен для авторизации
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Необходима авторизация');
      }

      const { data, error } = await SupabaseFunctions.invoke('analyze-reference-audio', {
        body: { audioUrl, audioLibraryId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      const result = data as any;
      logger.info('✅ [MANUAL-ANALYSIS] Analysis started', 'AudioUploadHandler', {
        recognitionId: result?.recognitionId,
        descriptionId: result?.descriptionId,
        audioLibraryId: audioLibraryId ?? 'null'
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
    
    // Сохраняем записанное аудио в audio_library
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: libraryData } = await supabase
          .from('audio_library')
          .insert({
            user_id: user.id,
            file_name: 'Записанное аудио',
            file_url: audioUrl,
            source_type: 'recording',
            analysis_status: 'pending',
          })
          .select('id')
          .single();

        logger.info('✅ Recorded audio saved to library', 'AudioUploadHandler', {
          libraryId: libraryData?.id
        });

        // Автоматический анализ записанного аудио
        if (libraryData?.id) {
          await handleManualAnalyze(audioUrl, libraryData.id);
        }
      }
    } catch (error) {
      logger.error('[RECORD] Failed to save to library', error instanceof Error ? error : new Error(String(error)), 'AudioUploadHandler');
    }
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
