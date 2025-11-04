/**
 * AudioController - компонент для управления воспроизведением аудио
 * Отделен от UI для оптимизации производительности
 */
import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying, useVolume, useAudioRef } from '@/stores/audioPlayerStore';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
export const AudioController = () => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const volume = useVolume();
  const audioRef = useAudioRef();
  
  // Служебные флаги для сериализации операций
  const isSettingSourceRef = useRef(false);
  const playLockRef = useRef(false);
  const lastLoadedTrackIdRef = useRef<string | null>(null);
  const retryTimeoutIdRef = useRef<number | null>(null);
  
  const updateCurrentTime = useAudioPlayerStore((state) => state.updateCurrentTime);
  const updateDuration = useAudioPlayerStore((state) => state.updateDuration);
  const updateBufferingProgress = useAudioPlayerStore((state) => state.updateBufferingProgress);
  const pause = useAudioPlayerStore((state) => state.pause);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const proxyTriedRef = useRef<Record<string, boolean>>({});  // ✅ FIX: Track per audio URL

  // Безопасный запуск воспроизведения с защитой от параллельных вызовов
  const safePlay = useCallback(async () => {
    const audio = audioRef?.current;
    if (!audio) return;
    if (isSettingSourceRef.current) {
      logger.info('Skip play: source is being set', 'AudioController', { trackId: currentTrack?.id });
      return;
    }
    if (playLockRef.current) {
      logger.warn('Skip play: another play() in progress', 'AudioController', { trackId: currentTrack?.id });
      return;
    }
    playLockRef.current = true;
    try {
      await audio.play();
      logger.info('Audio playback started', 'AudioController', { 
        trackId: currentTrack?.id,
        audio_url: currentTrack?.audio_url?.substring(0, 100) 
      });
    } catch (error) {
      logger.error('Failed to play audio', error as Error, 'AudioController', { trackId: currentTrack?.id });
      pause();
    } finally {
      playLockRef.current = false;
    }
  }, [audioRef, currentTrack?.id, currentTrack?.audio_url, pause]);

  // ============= УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ =============
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    if (isPlaying && currentTrack) {
      // Сериализованный запуск воспроизведения
      safePlay();
    } else {
      audio.pause();
    }
  }, [isPlaying, audioRef, currentTrack, pause, safePlay]);

  // ============= ЗАГРУЗКА НОВОГО ТРЕКА =============
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio || !currentTrack?.audio_url) return;

    // ✅ FIX: Validate audio_url format
    const audioUrl = currentTrack.audio_url.trim();
    if (!audioUrl || (!audioUrl.startsWith('http://') && !audioUrl.startsWith('https://') && !audioUrl.startsWith('blob:'))) {
      logger.error('Invalid audio_url format', new Error('Invalid URL'), 'AudioController', { 
        trackId: currentTrack.id,
        audio_url: audioUrl.substring(0, 100)
      });
      toast.error('Некорректный формат аудио файла');
      pause();
      return;
    }

    // ✅ Retry state
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 3000, 5000]; // Exponential backoff

    const loadAudioWithRetry = async () => {
      // Если во время ретрая сменился трек — прекращаем
      if (lastLoadedTrackIdRef.current && lastLoadedTrackIdRef.current !== currentTrack.id) {
        logger.info('Abort load: track changed', 'AudioController', {
          expected: lastLoadedTrackIdRef.current,
          actual: currentTrack.id,
        });
        return;
      }
      try {
        logger.info('Loading new track', 'AudioController', { 
          trackId: currentTrack.id,
          audio_url: audioUrl.substring(0, 100),
          attempt: retryCount + 1,
        });

        // Сериализованная установка источника
        isSettingSourceRef.current = true;
        audio.src = audioUrl;
        audio.load();
        updateCurrentTime(0);
        lastLoadedTrackIdRef.current = currentTrack.id;
        
        // Автовоспроизведение при смене трека будет вызвано через обработчик loadedmetadata
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

          if (retryTimeoutIdRef.current) {
            clearTimeout(retryTimeoutIdRef.current);
          }
          retryTimeoutIdRef.current = window.setTimeout(() => {
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
      finally {
        isSettingSourceRef.current = false;
      }
    };

    // Перед стартом — отменяем возможный предыдущий таймер
    if (retryTimeoutIdRef.current) {
      clearTimeout(retryTimeoutIdRef.current);
      retryTimeoutIdRef.current = null;
    }
    lastLoadedTrackIdRef.current = currentTrack.id;
    isSettingSourceRef.current = true;
    loadAudioWithRetry();

    // Add a listener for 'loadedmetadata' to trigger playback
    const handleLoadedMetadataAndPlay = () => {
      updateDuration(audio.duration || 0);
      logger.info('Audio metadata loaded', 'AudioController', {
        duration: audio.duration,
        trackId: currentTrack?.id
      });
      if (isPlaying) {
        safePlay(); // Only play if `isPlaying` is true
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadataAndPlay);

    // Очистка при смене трека/размонтировании
    return () => {
      if (retryTimeoutIdRef.current) {
        clearTimeout(retryTimeoutIdRef.current);
        retryTimeoutIdRef.current = null;
      }
      isSettingSourceRef.current = false;
      audio.removeEventListener('loadedmetadata', handleLoadedMetadataAndPlay);
    };
  }, [currentTrack?.audio_url, currentTrack?.id, audioRef, isPlaying, pause, updateCurrentTime, updateDuration, safePlay]);

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

    // handleLoadedMetadata is now handled in the track loading useEffect for playback
    const handleLoadedMetadata = () => {
      logger.info('Audio metadata loaded (secondary listener)', 'AudioController', {
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

      // ✅ FIX: Improved fallback with URL-specific tracking and timeout
      const audioUrl = currentTrack?.audio_url || '';
      if (
        !proxyTriedRef.current[audioUrl] &&
        audioUrl &&
        /mureka\.ai/.test(audioUrl) &&
        (errorCode === 3 || errorCode === 4)
      ) {
        proxyTriedRef.current[audioUrl] = true;
        toast.message('Преобразую аудио для воспроизведения...', {
          duration: 10000,
        });
        
        // ✅ FIX: Add 30s timeout for proxy request
        const PROXY_TIMEOUT = 30000;
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Proxy timeout after 30s')), PROXY_TIMEOUT)
        );
        
        (async () => {
          try {
            const proxyPromise = supabase.functions.invoke('fetch-audio-proxy', {
              body: { url: audioUrl },
            });
            
            const { data, error } = await Promise.race([proxyPromise, timeoutPromise]) as any;
            
            if (error || !data || !(data as any).base64) {
              throw error || new Error('proxy failed');
            }

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
            try { await audio.play(); } catch (e) {
              logger.error('Failed to play object URL audio', e as Error, 'AudioController', { trackId: currentTrack?.id });
            }
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
