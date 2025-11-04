import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger';

const MAX_RECORDING_TIME = 60; // seconds

export const useAudioRecorder = (
  onRecordComplete?: (url: string) => void,
  uploadAudio?: (file: File) => Promise<string | null>
) => {
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
        },
      });

      streamRef.current = stream;

      // Create cross-browser AudioContext
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported');
      }
      
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      // Resume AudioContext (required in some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Select best MIME type for MediaRecorder
      const mimeTypeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/aac',
      ];
      
      const mimeType = mimeTypeCandidates.find(type => 
        (window as any).MediaRecorder?.isTypeSupported?.(type)
      ) || 'audio/webm';
      
      logger.info('MediaRecorder MIME type', 'useAudioRecorder', { selected: mimeType });

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
        
        // Auto-upload to Supabase Storage if upload function is provided
        if (uploadAudio) {
          try {
            const fileName = `recording-${Date.now()}.webm`;
            const file = new File([blob], fileName, { type: blob.type });
            
            logger.info('Auto-uploading recording', 'useAudioRecorder', { fileName, size: blob.size });
            
            const uploadedUrl = await uploadAudio(file);
            
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
        } else {
          // No upload function provided, use blob URL
          const blobUrl = URL.createObjectURL(blob);
          setAudioUrl(blobUrl);
          onRecordComplete?.(blobUrl);
        }
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      
      logger.info('Recording started', 'useAudioRecorder', {
        mimeType: mediaRecorderRef.current.mimeType,
        state: mediaRecorderRef.current.state
      });
      
      // Fallback validator: ensure recording actually started
      setTimeout(() => {
        if (mediaRecorderRef.current?.state !== 'recording') {
          logger.error('Recording failed to start', new Error('MediaRecorder state check failed'), 'useAudioRecorder');
          setError('Не удалось начать запись. Попробуйте еще раз.');
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop());
        }
      }, 500);

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

    } catch (err) {
      const error = err as Error;
      logger.error('Failed to start recording', error, 'useAudioRecorder', {
        errorName: error.name,
        errorMessage: error.message
      });
      
      // Provide user-friendly error messages
      let errorMessage = 'Не удалось получить доступ к микрофону';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Микрофон не найден. Проверьте подключение устройства.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Микрофон занят другим приложением.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Параметры записи не поддерживаются вашим устройством.';
      } else if (error.name === 'SecurityError' || !window.isSecureContext) {
        errorMessage = 'Микрофон доступен только через HTTPS.';
      }
      
      setError(errorMessage);
      setIsRecording(false);
      
      toast({
        title: 'Ошибка записи',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [toast, uploadAudio, onRecordComplete]);

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
      // Ensure AudioContext is always closed on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
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
