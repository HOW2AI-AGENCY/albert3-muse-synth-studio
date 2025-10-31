/**
 * AudioController - компонент для управления воспроизведением аудио
 * Отделен от UI для оптимизации производительности
 */
import { useEffect, useRef } from 'react';
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying, useVolume, useAudioRef } from '@/stores/audioPlayerStore';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  const proxyTriedRef = useRef(false);

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

    // ✅ Retry state
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 3000, 5000]; // Exponential backoff

    const loadAudioWithRetry = async () => {
      try {
        logger.info('Loading new track', 'AudioController', { 
          trackId: currentTrack.id,
          audio_url: currentTrack.audio_url.substring(0, 100),
          attempt: retryCount + 1,
        });

        // Сброс текущих значений
        audio.src = currentTrack.audio_url;
        audio.load();
        updateCurrentTime(0);
        
        // Автовоспроизведение при смене трека
        if (isPlaying) {
          await audio.play();
        }
      } catch (error) {
        // ✅ Retry logic for network/temporary errors
        const isRetryableError = error instanceof Error && (
          error.message.includes('network') ||
          error.message.includes('fetch') ||
          error.message.includes('timeout') ||
          error.name === 'AbortError' ||
          error.name === 'NetworkError'
        );

        if (isRetryableError && retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAYS[retryCount - 1];
          
          logger.warn(`Audio load failed, retrying in ${delay}ms`, 'AudioController', {
            trackId: currentTrack.id,
            attempt: retryCount,
            maxRetries: MAX_RETRIES,
            error: error instanceof Error ? error.message : String(error),
          });

          setTimeout(() => {
            loadAudioWithRetry();
          }, delay);
        } else {
          logger.error('Auto-play failed after retries', error as Error, 'AudioController', {
            trackId: currentTrack.id,
            attempts: retryCount + 1,
          });
          pause();
        }
      }
    };

    loadAudioWithRetry();
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

    const handleError = () => {
      const errorCode = audio.error?.code;
      const errorMessage = audio.error?.message || 'Unknown error';
      
      logger.error('Audio loading error', new Error('Audio failed to load'), 'AudioController', {
        trackId: currentTrack?.id,
        audio_url: currentTrack?.audio_url?.substring(0, 100),
        errorCode,
        errorMessage,
      });

      // ✅ Show specific error messages based on error code
      const errorMessages: Record<number, string> = {
        1: 'Загрузка аудио прервана', // MEDIA_ERR_ABORTED
        2: 'Ошибка сети при загрузке аудио', // MEDIA_ERR_NETWORK
        3: 'Не удалось декодировать аудио', // MEDIA_ERR_DECODE
        4: 'Формат аудио не поддерживается', // MEDIA_ERR_SRC_NOT_SUPPORTED
      };

      // ✅ Fallback: прокси/перекодирование для Mureka CDN при ошибке формата/декодирования
      if (
        !proxyTriedRef.current &&
        currentTrack?.audio_url &&
        /mureka\.ai/.test(currentTrack.audio_url) &&
        (errorCode === 3 || errorCode === 4)
      ) {
        proxyTriedRef.current = true;
        toast.message('Преобразую аудио для воспроизведения...');
        (async () => {
          try {
            const { data, error } = await supabase.functions.invoke('fetch-audio-proxy', {
              body: { url: currentTrack.audio_url },
            });
            if (error || !data || !(data as any).base64) throw error || new Error('proxy failed');

            const base64: string = (data as any).base64;
            const contentType: string = (data as any).contentType || 'audio/mpeg';
            const binaryStr = atob(base64);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
            const blob = new Blob([bytes], { type: contentType });
            const objectUrl = URL.createObjectURL(blob);

            audio.src = objectUrl;
            audio.load();
            try { await audio.play(); } catch {}
            toast.success('Аудио подготовлено, воспроизвожу');
            return;
          } catch (e) {
            logger.error('Proxy audio fallback failed', e as Error, 'AudioController', { trackId: currentTrack?.id });
          }
          const userMessage = errorCode ? errorMessages[errorCode] || 'Ошибка загрузки аудио' : 'Ошибка загрузки аудио';
          toast.error(userMessage);
          pause();
        })();
        return;
      }

      const userMessage = errorCode ? errorMessages[errorCode] || 'Ошибка загрузки аудио' : 'Ошибка загрузки аудио';
      toast.error(userMessage);
      pause();
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
