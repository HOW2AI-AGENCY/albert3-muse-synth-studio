/**
 * Hook для управления воспроизведением аудио
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AudioPlayerTrack } from '@/types/track';
import { logInfo, logError } from '@/utils/logger';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { cacheAudioFile } from '@/utils/serviceWorker';
import { useToast } from '@/hooks/use-toast';
import { debounce } from '@/utils/debounce';
import { AUDIO_EXTENSIONS } from './types';

/**
 * Проверяет, является ли URL аудиофайлом
 * Доверяет известным доменам (Suno, Supabase) без проверки расширения
 */
export const hasKnownAudioExtension = (url: string): boolean => {
  // ✅ Whitelist доверенных доменов
  const trustedDomains = [
    'mfile.erweima.ai',
    'apiboxfiles.erweima.ai',
    'cdn1.suno.ai',
    'cdn2.suno.ai',
    'audiopipe.suno.ai',
    'supabase.co',
    'lovableproject.com'
  ];
  
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // ✅ Доверяем известным доменам без проверки расширения
    if (trustedDomains.some(domain => hostname.includes(domain))) {
      return true;
    }
    
    // Для остальных - проверка расширения
    const pathname = parsedUrl.pathname.toLowerCase();
    return AUDIO_EXTENSIONS.some(extension => pathname.endsWith(extension));
  } catch {
    // Fallback для невалидных URL
    const sanitized = url.split('?')[0]?.toLowerCase() ?? '';
    const lastSegment = sanitized.split('/').pop() ?? '';
    return AUDIO_EXTENSIONS.some(extension => lastSegment.endsWith(extension));
  }
};

export const useAudioPlayback = () => {
  const [currentTrack, setCurrentTrack] = useState<AudioPlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [bufferingProgress, setBufferingProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const { toast } = useToast();

  const isKnownAudioExtension = useCallback((url: string) => hasKnownAudioExtension(url), []);

  /**
   * Retry logic с экспоненциальной задержкой
   */
  const retryWithBackoff = useCallback(async (
    fn: () => Promise<void>,
    maxRetries: number = 3
  ): Promise<void> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await fn();
        retryCountRef.current = 0; // Сброс счетчика после успеха
        return;
      } catch (error) {
        const isNetworkError = (error as Error).message.includes('Network error');
        const isLastAttempt = attempt === maxRetries;
        
        if (!isNetworkError || isLastAttempt) {
          throw error;
        }
        
        // Экспоненциальная задержка: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        logInfo(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, 'useAudioPlayback');
        
        toast({
          title: "Повтор загрузки...",
          description: `Попытка ${attempt + 2} из ${maxRetries + 1}`,
          duration: 2000,
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [toast]);

  const playTrack = useCallback(async (
    track: AudioPlayerTrack,
    loadVersionsCallback?: (trackId: string, wasEmpty: boolean) => Promise<void>
  ) => {
    // ✅ Guard clause против повторных вызовов
    if (isLoadingRef.current) {
      logInfo('Playback already in progress, ignoring duplicate call', 'useAudioPlayback');
      return;
    }
    
    // ✅ Начать мониторинг загрузки аудио
    const loadingId = `audio-load-${track.id}`;
    performanceMonitor.startTimer(loadingId, 'AudioPlayer');
    
    // ✅ Отменить предыдущую загрузку
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      logInfo('Aborted previous playTrack request', 'useAudioPlayback');
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    isLoadingRef.current = true;
    
    const audioUrl = track.audio_url?.trim();
    
    if (!audioUrl || audioUrl === '') {
      logError('Invalid audio URL', new Error('Audio URL is empty or null'), 'useAudioPlayback', { 
        trackId: track.id,
        urlValue: audioUrl 
      });
      toast({
        title: "Ошибка воспроизведения",
        description: "URL аудио отсутствует",
        variant: "destructive",
      });
      isLoadingRef.current = false;
      return;
    }

    if (!isKnownAudioExtension(audioUrl)) {
      logError('Unknown audio format', new Error(`URL does not have known audio extension: ${audioUrl}`), 'useAudioPlayback', {
        trackId: track.id,
        url: audioUrl
      });
      toast({
        title: "Неизвестный формат",
        description: "Файл не является аудио",
        variant: "destructive",
      });
      isLoadingRef.current = false;
      return;
    }

    const normalizedTrack = {
      ...track,
      audio_url: audioUrl,
      isOriginalVersion: track.isOriginalVersion ?? (track.versionNumber === 0),
      sourceVersionNumber: track.sourceVersionNumber ?? null,
    };
    
    logInfo('Playing track', 'useAudioPlayback', {
      trackId: normalizedTrack.id,
      title: normalizedTrack.title,
      parentTrackId: normalizedTrack.parentTrackId,
      versionNumber: normalizedTrack.versionNumber,
      urlPreview: audioUrl.substring(0, 60) + '...',
      status: normalizedTrack.status
    });

    try {
      if (signal.aborted) {
        isLoadingRef.current = false;
        return;
      }

      if (audioRef.current) {
        // ✅ Дождаться завершения предыдущей загрузки
        if (audioRef.current.readyState > 0) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }

      setCurrentTrack(normalizedTrack);
      setIsPlaying(false);

      if (loadVersionsCallback) {
        const baseTrackId = normalizedTrack.parentTrackId || normalizedTrack.id;
        await loadVersionsCallback(baseTrackId, false);
      }

      if (signal.aborted) {
        isLoadingRef.current = false;
        return;
      }

      if (audioRef.current && audioUrl) {
        // ✅ Retry logic для загрузки аудио
        await retryWithBackoff(async () => {
          setBufferingProgress(0);
          
          const isInternalUrl = audioUrl.includes('supabase') || audioUrl.includes('lovable');
          if (isInternalUrl) {
            audioRef.current!.crossOrigin = 'anonymous';
            logInfo('Applied crossOrigin for internal URL', 'useAudioPlayback');
          } else {
            audioRef.current!.removeAttribute('crossOrigin');
            logInfo('Skipped crossOrigin for external URL', 'useAudioPlayback');
          }
          
          // ✅ Установить новый src только после pause
          audioRef.current!.src = audioUrl;
          audioRef.current!.load();
          
          // ✅ Дождаться canplay event с error handling и progress
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              cleanup();
              reject(new Error('Audio load timeout after 30s'));
            }, 30000);
            
            const handleProgress = () => {
              if (!audioRef.current) return;
              const buffered = audioRef.current.buffered;
              if (buffered.length > 0) {
                const bufferedEnd = buffered.end(buffered.length - 1);
                const duration = audioRef.current.duration;
                if (duration > 0) {
                  const progress = (bufferedEnd / duration) * 100;
                  setBufferingProgress(Math.min(progress, 100));
                }
              }
            };
            
            const handleCanPlay = () => {
              setBufferingProgress(100);
              cleanup();
              resolve();
            };
            
            const handleError = (e: Event) => {
              cleanup();
              const error = (e.target as HTMLAudioElement).error;
              const errorCode = error?.code;
              const errorName = errorCode === 1 ? 'MEDIA_ELEMENT_ERROR: Aborted' :
                              errorCode === 2 ? 'MEDIA_ELEMENT_ERROR: Network error' :
                              errorCode === 3 ? 'MEDIA_ELEMENT_ERROR: Decode error' :
                              errorCode === 4 ? 'MEDIA_ELEMENT_ERROR: Format error' : 
                              'MEDIA_ELEMENT_ERROR: Unknown error';
              
              // ✅ Log detailed audio error for debugging
              logError('Audio element error during load', new Error(errorName), 'useAudioPlayback', {
                trackId: normalizedTrack.id,
                audioUrl: audioUrl.slice(0, 100),
                errorCode,
                errorMessage: error?.message,
                networkState: audioRef.current?.networkState,
                readyState: audioRef.current?.readyState,
              });
              
              reject(new Error(`Audio load failed: ${errorName}`));
            };
            
            const cleanup = () => {
              clearTimeout(timeoutId);
              audioRef.current?.removeEventListener('canplay', handleCanPlay);
              audioRef.current?.removeEventListener('error', handleError);
              audioRef.current?.removeEventListener('progress', handleProgress);
            };
            
            audioRef.current!.addEventListener('canplay', handleCanPlay);
            audioRef.current!.addEventListener('error', handleError);
            audioRef.current!.addEventListener('progress', handleProgress);
          });
        });

        if (signal.aborted) {
          isLoadingRef.current = false;
          return;
        }
        
        try {
          await cacheAudioFile(audioUrl);
        } catch (error) {
          logError('Failed to cache audio file', error as Error, 'useAudioPlayback', { trackId: normalizedTrack.id });
        }

        try {
          await audioRef.current.play();
          setIsPlaying(true);
          
          // ✅ Записать метрику успешной загрузки
          performanceMonitor.endTimer(
            loadingId,
            'audio.loadSuccess',
            'AudioPlayer',
            {
              trackId: normalizedTrack.id,
              title: normalizedTrack.title,
              versionNumber: normalizedTrack.versionNumber,
            }
          );
          
          logInfo(`Now playing: ${normalizedTrack.title}`, 'useAudioPlayback', {
            trackId: normalizedTrack.id,
            versionNumber: normalizedTrack.versionNumber,
            sourceVersionNumber: normalizedTrack.sourceVersionNumber,
            isOriginal: normalizedTrack.isOriginalVersion,
          });

          if (!normalizedTrack.isOriginalVersion && normalizedTrack.versionNumber) {
            toast({
              title: `Версия ${normalizedTrack.versionNumber}`,
              description: `Переключено на ${normalizedTrack.title}`,
              duration: 2000,
            });
          }
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            logInfo('Playback aborted by user', 'useAudioPlayback');
            isLoadingRef.current = false;
            return;
          }
          const errorMessage = (error as Error).message;
          logError('Failed to play track', error as Error, 'useAudioPlayback', { 
            trackId: normalizedTrack.id,
            retryCount: retryCountRef.current 
          });
          
          toast({
            title: "Ошибка воспроизведения",
            description: errorMessage.includes('Network') 
              ? "Проблема с сетью. Проверьте подключение."
              : "Не удалось загрузить аудиофайл. Попробуйте ещё раз.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logInfo('Playback aborted by user', 'useAudioPlayback');
        return;
      }
      logError('Error in playTrack', error as Error, 'useAudioPlayback', { 
        trackId: normalizedTrack.id,
        retryCount: retryCountRef.current 
      });
    } finally {
      isLoadingRef.current = false;
      setBufferingProgress(0);
    }
  }, [toast, isKnownAudioExtension, retryWithBackoff]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    // ✅ Комплексная проверка готовности к воспроизведению
    if (!audioRef.current.src || audioRef.current.src === '' || audioRef.current.readyState < 2) {
      logError('Cannot play: audio not ready', new Error('Missing src or readyState < 2'), 'useAudioPlayback', {
        src: audioRef.current.src,
        readyState: audioRef.current.readyState
      });
      toast({
        title: "Аудио не загружено",
        description: "Подождите завершения загрузки или выберите трек заново.",
        variant: "destructive",
      });
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      logInfo('Playback paused', 'useAudioPlayback');
    } else {
      audioRef.current.play().catch((error) => {
        // ✅ Более информативная ошибка
        logError('Failed to play', error as Error, 'useAudioPlayback', {
          readyState: audioRef.current?.readyState,
          networkState: audioRef.current?.networkState
        });
        toast({
          title: "Ошибка воспроизведения",
          description: error.name === 'NotAllowedError' 
            ? 'Браузер заблокировал автовоспроизведение'
            : 'Не удалось воспроизвести трек',
          variant: "destructive",
        });
      });
      setIsPlaying(true);
      logInfo('Playback resumed', 'useAudioPlayback');
    }
  }, [isPlaying, toast]);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      logInfo('Track paused', 'useAudioPlayback');
    }
  }, []);

  // ✅ Debounced seekTo для плавной прокрутки без задержек
  const debouncedSeekTo = useMemo(
    () => debounce((time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      }
    }, 100),
    []
  );

  const seekTo = useCallback((time: number) => {
    // Немедленно обновляем UI для отзывчивости
    setCurrentTime(time);
    // Применяем к audio элементу с debounce
    debouncedSeekTo(time);
  }, [debouncedSeekTo]);

  // ✅ Debounced setVolume для плавного изменения громкости
  const debouncedSetVolume = useMemo(
    () => debounce((newVolume: number) => {
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
    }, 50),
    []
  );

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    // Немедленно обновляем UI
    setVolumeState(clampedVolume);
    // Применяем к audio элементу с debounce
    debouncedSetVolume(clampedVolume);
  }, [debouncedSetVolume]);

  const clearCurrentTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    logInfo('Current track cleared', 'useAudioPlayback');
  }, []);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    bufferingProgress,
    audioRef,
    playTrack,
    togglePlayPause,
    pauseTrack,
    seekTo,
    setVolume,
    clearCurrentTrack,
    isKnownAudioExtension,
  };
};
