import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger';

const MAX_RECORDING_TIME = 60; // seconds

export const useAudioRecorder = (onRecordComplete?: (url: string) => void) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordingTime(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // AudioContext for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      // MediaRecorder for recording
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        
        // Cleanup stream first
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        logger.info('Recording stopped', 'useAudioRecorder', {
          size: blob.size,
          duration: recordingTime,
          mimeType
        });
        
        // Auto-upload to Supabase Storage
        try {
          const { useAudioUpload } = await import('@/hooks/useAudioUpload');
          const { uploadAudio: uploadFn } = useAudioUpload();
          
          const fileName = `recording-${Date.now()}.webm`;
          const file = new File([blob], fileName, { type: blob.type });
          
          logger.info('Auto-uploading recording', 'useAudioRecorder', { fileName, size: blob.size });
          
          const uploadedUrl = await uploadFn(file);
          
          if (uploadedUrl) {
            setAudioUrl(uploadedUrl);
            logger.info('Recording uploaded successfully', 'useAudioRecorder', { url: uploadedUrl.substring(0, 50) });
            
            // Notify parent component
            onRecordComplete?.(uploadedUrl);
            
            toast({
              title: '🎤 Запись загружена',
              description: 'Аудио готово к использованию',
            });
          } else {
            // Fallback to blob URL if upload fails
            const blobUrl = URL.createObjectURL(blob);
            setAudioUrl(blobUrl);
            logger.warn('Upload failed, using blob URL', 'useAudioRecorder');
            
            toast({
              title: '⚠️ Ошибка загрузки',
              description: 'Используется локальная копия. Повторите попытку.',
              variant: 'destructive',
            });
          }
        } catch (error) {
          logger.error('Auto-upload error', error instanceof Error ? error : undefined, 'useAudioRecorder');
          // Fallback to blob URL
          const blobUrl = URL.createObjectURL(blob);
          setAudioUrl(blobUrl);
          
          toast({
            title: '⚠️ Ошибка загрузки',
            description: 'Используется локальная копия. Проверьте подключение.',
            variant: 'destructive',
          });
        }
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording();
            toast({
              title: 'Максимальное время достигнуто',
              description: 'Запись остановлена автоматически',
            });
            return MAX_RECORDING_TIME;
          }
          return newTime;
        });
      }, 1000);

      logger.info('Recording started');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Не удалось получить доступ к микрофону';
      setError(errorMessage);
      logger.error('Recording error', err instanceof Error ? err : undefined);
      toast({
        title: 'Ошибка записи',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
    chunksRef.current = [];
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, stopRecording, audioUrl]);

  return {
    isRecording,
    audioBlob,
    audioUrl,
    recordingTime,
    error,
    analyser: analyserRef.current,
    maxTime: MAX_RECORDING_TIME,
    startRecording,
    stopRecording,
    reset,
  };
};
