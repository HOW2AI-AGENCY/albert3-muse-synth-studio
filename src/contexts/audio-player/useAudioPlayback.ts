/**
 * Hook для управления воспроизведением аудио
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioPlayerTrack } from '@/types/track';
import { logInfo, logError } from '@/utils/logger';
import { cacheAudioFile } from '@/utils/serviceWorker';
import { useToast } from '@/hooks/use-toast';
import { AUDIO_EXTENSIONS } from './types';

export const hasKnownAudioExtension = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();
    return AUDIO_EXTENSIONS.some(extension => pathname.endsWith(extension));
  } catch {
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
        
        // ✅ Дождаться canplay event
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Audio load timeout')), 10000);
          
          const handleCanPlay = () => {
            clearTimeout(timeoutId);
            audioRef.current?.removeEventListener('canplay', handleCanPlay);
            resolve();
          };
          
          audioRef.current!.addEventListener('canplay', handleCanPlay);
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
    
    // ✅ Проверить наличие src перед play()
    if (!audioRef.current.src || audioRef.current.src === '') {
      logError('Cannot play: no audio source', new Error('Missing src'), 'useAudioPlayback');
      toast({
        title: "Ошибка воспроизведения",
        description: "Аудио не загружено. Выберите трек заново.",
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
        logError('Failed to resume playback', error as Error, 'useAudioPlayback');
        toast({
          title: "Ошибка воспроизведения",
          description: "Не удалось возобновить воспроизведение.",
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

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

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
