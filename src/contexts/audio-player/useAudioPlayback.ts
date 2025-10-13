/**
 * Hook для управления воспроизведением аудио
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AudioPlayerTrack } from '@/types/track';
import { logInfo, logError } from '@/utils/logger';
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
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const isKnownAudioExtension = useCallback((url: string) => hasKnownAudioExtension(url), []);

  const playTrack = useCallback(async (
    track: AudioPlayerTrack,
    loadVersionsCallback?: (trackId: string, wasEmpty: boolean) => Promise<void>
  ) => {
    // ✅ Guard clause против повторных вызовов
    if (isLoadingRef.current) {
      logInfo('Playback already in progress, ignoring duplicate call', 'useAudioPlayback');
      return;
    }
    
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
        const isInternalUrl = audioUrl.includes('supabase') || audioUrl.includes('lovable');
        if (isInternalUrl) {
          audioRef.current.crossOrigin = 'anonymous';
          logInfo('Applied crossOrigin for internal URL', 'useAudioPlayback');
        } else {
          audioRef.current.removeAttribute('crossOrigin');
          logInfo('Skipped crossOrigin for external URL', 'useAudioPlayback');
        }
        
        // ✅ Установить новый src только после pause
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        
        // ✅ Дождаться canplay event с error handling
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('Audio load timeout after 30s'));
          }, 30000); // ✅ 30 секунд вместо 10
          
          const handleCanPlay = () => {
            cleanup();
            resolve();
          };
          
          const handleError = (e: Event) => {
            cleanup();
            const error = (e.target as HTMLAudioElement).error;
            reject(new Error(`Audio load failed: ${error?.message || 'Unknown error'}`));
          };
          
          const cleanup = () => {
            clearTimeout(timeoutId);
            audioRef.current?.removeEventListener('canplay', handleCanPlay);
            audioRef.current?.removeEventListener('error', handleError);
          };
          
          audioRef.current!.addEventListener('canplay', handleCanPlay);
          audioRef.current!.addEventListener('error', handleError); // ✅ Обработка ошибок загрузки
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
          logError('Failed to play track', error as Error, 'useAudioPlayback', { trackId: normalizedTrack.id });
          toast({
            title: "Ошибка воспроизведения",
            description: "Не удалось загрузить аудиофайл. Попробуйте ещё раз.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logInfo('Playback aborted by user', 'useAudioPlayback');
        return;
      }
      logError('Error in playTrack', error as Error, 'useAudioPlayback', { trackId: normalizedTrack.id });
    } finally {
      isLoadingRef.current = false;
    }
  }, [toast, isKnownAudioExtension]);

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
