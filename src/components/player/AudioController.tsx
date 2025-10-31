/**
 * AudioController - компонент для управления воспроизведением аудио
 * Отделен от UI для оптимизации производительности
 */
import { useEffect } from 'react';
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying, useVolume, useAudioRef } from '@/stores/audioPlayerStore';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AudioController = () => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const volume = useVolume();
  const audioRef = useAudioRef();
  
  const updateCurrentTime = useAudioPlayerStore((state) => state.updateCurrentTime);
  const updateDuration = useAudioPlayerStore((state) => state.updateDuration);
  const updateBufferingProgress = useAudioPlayerStore((state) => state.updateBufferingProgress);
  const pause = useAudioPlayerStore((state) => state.pause);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const playNext = useAudioPlayerStore((state) => state.playNext);

  // ============= УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ =============
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const playAudio = async () => {
      try {
        await audio.play();
        logger.info('Audio playback started', 'AudioController', { 
          trackId: currentTrack?.id,
          audio_url: currentTrack?.audio_url?.substring(0, 100) 
        });
      } catch (error) {
        logger.error('Failed to play audio', error as Error, 'AudioController', { 
          trackId: currentTrack?.id 
        });
        pause();
      }
    };

    if (isPlaying && currentTrack) {
      playAudio();
    } else {
      audio.pause();
    }
  }, [isPlaying, audioRef, currentTrack, pause]);

  // ============= ЗАГРУЗКА НОВОГО ТРЕКА =============
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio || !currentTrack?.audio_url) return;

    logger.info('Loading new track', 'AudioController', { 
      trackId: currentTrack.id,
      audio_url: currentTrack.audio_url.substring(0, 100)
    });

    // Сброс текущих значений
    audio.src = currentTrack.audio_url;
    audio.load();
    updateCurrentTime(0);
    
    // Автовоспроизведение при смене трека
    if (isPlaying) {
      audio.play().catch((error) => {
        logger.error('Auto-play failed', error as Error, 'AudioController');
        pause();
      });
    }
  }, [currentTrack?.audio_url, currentTrack?.id, audioRef, isPlaying, pause, updateCurrentTime]);

  // ============= ГРОМКОСТЬ =============
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    
    audio.volume = volume;
  }, [volume, audioRef]);

  // ============= СОБЫТИЯ АУДИО =============
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      updateCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      updateDuration(audio.duration || 0);
      logger.info('Audio metadata loaded', 'AudioController', { 
        duration: audio.duration,
        trackId: currentTrack?.id 
      });
    };

    const handleEnded = () => {
      logger.info('Track ended, playing next', 'AudioController', { 
        trackId: currentTrack?.id 
      });
      playNext();
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const duration = audio.duration || 1;
        updateBufferingProgress((bufferedEnd / duration) * 100);
      }
    };

    const handleError = async () => {
      logger.error('Audio loading error', new Error('Audio failed to load'), 'AudioController', {
        trackId: currentTrack?.id,
        audio_url: currentTrack?.audio_url?.substring(0, 100),
        errorCode: audio.error?.code,
        errorMessage: audio.error?.message,
      });

      // Попытка обновить истекший URL через Edge Function
      if (currentTrack && audio.error?.code === 4) {
        try {
          logger.info('Attempting to refresh expired audio URL', 'AudioController', {
            trackId: currentTrack.id
          });

          const { data, error } = await supabase.functions.invoke('refresh-track-audio', {
            body: { trackId: currentTrack.id }
          });

          if (error) throw error;

          if (data?.audio_url) {
            logger.info('Audio URL refreshed successfully', 'AudioController');
            
            // Обновляем трек с новым URL
            playTrack({
              ...currentTrack,
              audio_url: data.audio_url
            });
            
            toast.success('Аудио обновлено');
          }
        } catch (refreshError) {
          logger.error('Failed to refresh audio URL', refreshError as Error, 'AudioController');
          toast.error('Не удалось загрузить аудио');
          pause();
        }
      } else {
        toast.error('Ошибка загрузки аудио');
        pause();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('error', handleError);
    };
  }, [
    audioRef, 
    currentTrack, 
    updateCurrentTime, 
    updateDuration, 
    updateBufferingProgress, 
    playNext, 
    pause, 
    playTrack
  ]);

  // Рендерим скрытый audio элемент
  return (
    <audio
      ref={audioRef}
      preload="auto"
      crossOrigin="anonymous"
      className="hidden"
    />
  );
};
