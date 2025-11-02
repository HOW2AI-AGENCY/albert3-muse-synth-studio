/**
 * Audio recording hook
 * Records generated audio and saves to Supabase storage
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioRecorder } from '@/utils/audio/audio-recorder';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

export const useAudioRecorder = (audioContext: AudioContext | null) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);

  const startRecording = useCallback(async () => {
    if (!audioContext) {
      toast.error('AudioContext не инициализирован');
      return;
    }

    try {
      recorderRef.current = new AudioRecorder(audioContext);
      await recorderRef.current.startRecording();
      setIsRecording(true);
      
      toast.success('🎙️ Запись началась');
      logger.info('[AudioRecorder] Recording started', 'useAudioRecorder');
    } catch (error) {
      logger.error('[AudioRecorder] Start failed', error as Error, 'useAudioRecorder');
      toast.error('Не удалось начать запись');
    }
  }, [audioContext]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!recorderRef.current) return null;

    try {
      const blob = await recorderRef.current.stopRecording();
      setRecordedBlob(blob);
      setIsRecording(false);
      recorderRef.current.cleanup();

      toast.success('✅ Запись завершена');
      logger.info('[AudioRecorder] Recording stopped', 'useAudioRecorder', {
        size: blob.size
      });

      return blob;
    } catch (error) {
      logger.error('[AudioRecorder] Stop failed', error as Error, 'useAudioRecorder');
      toast.error('Ошибка при завершении записи');
      return null;
    }
  }, []);

  const saveToLibrary = useCallback(async (blob: Blob, fileName: string): Promise<string | null> => {
    try {
      const file = new File([blob], fileName, { type: 'audio/webm' });
      
      const { data, error } = await supabase.storage
        .from('reference-audio')
        .upload(`prompt-dj/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('reference-audio')
        .getPublicUrl(data.path);

      toast.success('💾 Сэмпл сохранен в библиотеке');
      logger.info('[AudioRecorder] Saved to library', 'useAudioRecorder', {
        path: data.path,
        url: urlData.publicUrl
      });

      return urlData.publicUrl;
    } catch (error) {
      logger.error('[AudioRecorder] Save failed', error as Error, 'useAudioRecorder');
      toast.error('Не удалось сохранить сэмпл');
      return null;
    }
  }, []);

  return {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    saveToLibrary,
  };
};
