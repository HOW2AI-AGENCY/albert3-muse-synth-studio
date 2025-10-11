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
  const { toast } = useToast();

  const isKnownAudioExtension = useCallback((url: string) => hasKnownAudioExtension(url), []);

  const playTrack = useCallback(async (
    track: AudioPlayerTrack,
    loadVersionsCallback?: (trackId: string, wasEmpty: boolean) => Promise<void>
  ) => {
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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setCurrentTrack(normalizedTrack);
      setIsPlaying(false);

      if (loadVersionsCallback) {
        const baseTrackId = normalizedTrack.parentTrackId || normalizedTrack.id;
        await loadVersionsCallback(baseTrackId, false);
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
        
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        
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
          logError('Failed to play track', error as Error, 'useAudioPlayback', { trackId: normalizedTrack.id });
          toast({
            title: "Ошибка воспроизведения",
            description: "Не удалось загрузить аудиофайл. Попробуйте ещё раз.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      logError('Error in playTrack', error as Error, 'useAudioPlayback', { trackId: normalizedTrack.id });
    }
  }, [toast, isKnownAudioExtension]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      logInfo('Playback paused', 'useAudioPlayback');
    } else {
      audioRef.current.play().catch((error) => {
        logError('Failed to resume playback', error as Error, 'useAudioPlayback');
      });
      setIsPlaying(true);
      logInfo('Playback resumed', 'useAudioPlayback');
    }
  }, [isPlaying]);

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
