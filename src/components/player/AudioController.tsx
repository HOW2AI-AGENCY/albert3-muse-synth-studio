/**
 * AudioController - компонент для управления воспроизведением аудио
 * Отделен от UI для оптимизации производительности
 */
import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying, useVolume, useAudioRef } from '@/stores/audioPlayerStore';
import type { AudioPlayerTrack } from '@/stores/audioPlayerStore';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
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
  const mediaSessionSetRef = useRef(false);
  // ✅ FIX [React error #185]: Отслеживание mounted состояния для предотвращения setState на размонтированном компоненте
  const isMountedRef = useRef(true);
  // ✅ FIX [React error #185]: AbortController для отмены proxy запросов при unmount
  const proxyAbortControllerRef = useRef<AbortController | null>(null);
  
  const updateCurrentTime = useAudioPlayerStore((state) => state.updateCurrentTime);
  const updateDuration = useAudioPlayerStore((state) => state.updateDuration);
  const updateBufferingProgress = useAudioPlayerStore((state) => state.updateBufferingProgress);
  const pause = useAudioPlayerStore((state) => state.pause);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const playPrevious = useAudioPlayerStore((state) => state.playPrevious);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const proxyTriedRef = useRef<Record<string, boolean>>({});  // ✅ FIX: Track per audio URL

  // Стабилизированный обработчик для action 'previoustrack' MediaSession
  const handlePlayPrevious = useCallback(() => {
    logger.info('MediaSession: previous track action', 'AudioController');
    playPrevious();
  }, [playPrevious]);

  // Безопасный запуск воспроизведения с защитой от параллельных вызовов
  const safePlay = useCallback(async () => {
    const audio = audioRef?.current;
    if (!audio) return;

    // Не пытаться играть во время смены источника
    if (isSettingSourceRef.current) {
      logger.info('Skip play: source is being set', 'AudioController', { trackId: currentTrack?.id });
      return;
    }

    // Блокировка конкурентных вызовов play()
    if (playLockRef.current) {
      logger.warn('Skip play: another play() in progress', 'AudioController', { trackId: currentTrack?.id });
      return;
    }
    playLockRef.current = true;

    try {
      // Дождаться готовности к воспроизведению, чтобы избежать AbortError при смене src
      if (audio.readyState < 3) {
        await new Promise<void>((resolve) => {
          let timeoutId: number | null = null;
          const cleanup = () => {
            audio.removeEventListener('canplay', onReady);
            audio.removeEventListener('loadeddata', onReady);
            audio.removeEventListener('stalled', onReady);
            audio.removeEventListener('error', onReady);
            if (timeoutId) window.clearTimeout(timeoutId);
          };
          const onReady = () => {
            cleanup();
            resolve();
          };
          audio.addEventListener('canplay', onReady, { once: true });
          audio.addEventListener('loadeddata', onReady, { once: true });
          audio.addEventListener('stalled', onReady, { once: true });
          audio.addEventListener('error', onReady, { once: true });
          timeoutId = window.setTimeout(onReady, 1500); // fail-soft через 1.5s
        });
      }

      await audio.play();
      logger.info('Audio playback started', 'AudioController', { 
        trackId: currentTrack?.id,
        audio_url: currentTrack?.audio_url?.substring(0, 100) 
      });
    } catch (error) {
      // Частый случай при мгновенной смене трека: AbortError — не считаем ошибкой
      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.warn('play() aborted due to a new load; ignoring', 'AudioController', { trackId: currentTrack?.id });
      } else {
        logger.error('Failed to play audio', error as Error, 'AudioController', { trackId: currentTrack?.id });
        // Не принудительно ставим на паузу при ошибке автозапуска — оставим решение UI/пользователю
      }
    } finally {
      playLockRef.current = false;
    }
  }, [audioRef, currentTrack?.id, currentTrack?.audio_url]);

  // ============= MEDIASESSION API =============
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.style_tags?.[0] || 'AI Generated',
        album: 'Albert3 Muse Synth Studio',
        artwork: currentTrack.cover_url
          ? [
              { src: currentTrack.cover_url, sizes: '512x512', type: 'image/jpeg' },
              { src: currentTrack.cover_url, sizes: '256x256', type: 'image/jpeg' },
              { src: currentTrack.cover_url, sizes: '128x128', type: 'image/jpeg' },
            ]
          : [],
      });

      // Set action handlers only once
      if (!mediaSessionSetRef.current) {
        navigator.mediaSession.setActionHandler('play', () => {
          logger.info('MediaSession: play action', 'AudioController');
          playTrack(currentTrack);
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          logger.info('MediaSession: pause action', 'AudioController');
          pause();
        });

        navigator.mediaSession.setActionHandler('previoustrack', handlePlayPrevious);

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          logger.info('MediaSession: next track action', 'AudioController');
          playNext();
        });

        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            logger.info('MediaSession: seek action', 'AudioController', { seekTime: details.seekTime });
            seekTo(details.seekTime);
          }
        });

        mediaSessionSetRef.current = true;
      }

      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      logger.info('MediaSession metadata updated', 'AudioController', {
        title: currentTrack.title,
        isPlaying,
      });
    } catch (error) {
      logger.error('Failed to set MediaSession', error as Error, 'AudioController');
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [currentTrack, isPlaying, playTrack, pause, playNext, seekTo, handlePlayPrevious]);

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

    // ✅ FIX [React error #185]: Ref для отслеживания timeout из handleLoadedMetadataAndPlay
    let playTimeoutId: number | null = null;

    // Add a listener for 'loadedmetadata' to trigger playback
    const handleLoadedMetadataAndPlay = () => {
      // ✅ FIX [React error #185]: Проверка mounted перед обновлением состояния
      // WHY: Событие loadedmetadata асинхронное, может произойти после unmount
      if (!isMountedRef.current) {
        logger.debug('Component unmounted, skipping metadata handler', 'AudioController');
        return;
      }

      updateDuration(audio.duration || 0);
      logger.info('Audio metadata loaded', 'AudioController', {
        duration: audio.duration,
        trackId: currentTrack?.id
      });

      if (isPlaying) {
        // ✅ FIX [React error #185]: Сохранить timeoutId для cleanup
        // Небольшая задержка, чтобы избежать гонки с load()
        playTimeoutId = window.setTimeout(() => {
          if (isMountedRef.current) {
            safePlay();
          }
        }, 0);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadataAndPlay);

    // Очистка при смене трека/размонтировании
    return () => {
      // ✅ FIX [React error #185]: Установить unmounted флаг
      isMountedRef.current = false;

      if (retryTimeoutIdRef.current) {
        clearTimeout(retryTimeoutIdRef.current);
        retryTimeoutIdRef.current = null;
      }

      // ✅ FIX [React error #185]: Отменить timeout из handleLoadedMetadataAndPlay
      if (playTimeoutId !== null) {
        clearTimeout(playTimeoutId);
        playTimeoutId = null;
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
  // Ref-обертка для колбэков, чтобы избежать их в зависимостях useEffect
  const latestActions = useRef({
    updateCurrentTime,
    updateBufferingProgress,
    playNext,
    pause,
  });

  // Обновляем ref при каждом рендере, чтобы иметь доступ к последним версиям функций
  useEffect(() => {
    latestActions.current = {
      updateCurrentTime,
      updateBufferingProgress,
      playNext,
      pause,
    };
  });

  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    let lastUpdateTime = 0;
    const handleTimeUpdate = () => {
      // ✅ FIX [React error #185]: Проверка mounted перед обновлением состояния
      // WHY: Событие timeupdate вызывается ~4 раза/сек, может произойти после unmount
      if (!isMountedRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastUpdateTime >= 250) { // Throttling до 250ms
        latestActions.current.updateCurrentTime(audio.currentTime);
        lastUpdateTime = now;
      }
    };

    const handleEnded = () => {
      logger.info('Track ended, playing next', 'AudioController', {
        trackId: currentTrack?.id
      });
      latestActions.current.playNext();
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const duration = audio.duration || 1;
        latestActions.current.updateBufferingProgress((bufferedEnd / duration) * 100);
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

      const errorMessages: Record<number, string> = {
        1: 'Загрузка аудио прервана',
        2: 'Ошибка сети при загрузке аудио',
        3: 'Не удалось декодировать аудио',
        4: 'Формат аудио не поддерживается',
      };

      const audioUrl = currentTrack?.audio_url || '';
      if (
        !proxyTriedRef.current[audioUrl] &&
        audioUrl &&
        /mureka\.ai/.test(audioUrl) &&
        (errorCode === 3 || errorCode === 4)
      ) {
        proxyTriedRef.current[audioUrl] = true;

        // ✅ FIX [React error #185]: Создать AbortController для отмены запроса при unmount
        // WHY: Proxy запрос может занять до 15s, компонент может размонтироваться за это время
        const abortController = new AbortController();
        proxyAbortControllerRef.current = abortController;

        // ✅ P2 FIX: Show loading toast with progress indicator
        const loadingToastId = toast.loading('Подготовка аудио для воспроизведения...');
        const PROXY_TIMEOUT = 15000;

        (async () => {
          try {
            // ✅ FIX [React error #185]: Создать timeout с AbortController
            const timeoutId = setTimeout(() => {
              abortController.abort();
            }, PROXY_TIMEOUT);

            const { data, error } = await SupabaseFunctions.invoke('fetch-audio-proxy', {
              body: { url: audioUrl },
            });

            clearTimeout(timeoutId);

            // ✅ FIX [React error #185]: Проверить mounted перед продолжением
            // WHY: Запрос может завершиться после unmount компонента
            if (!isMountedRef.current) {
              logger.debug('Component unmounted, aborting proxy fallback', 'AudioController');
              return;
            }

            // ✅ FIX [React error #185]: Проверить abort signal
            if (abortController.signal.aborted) {
              throw new Error('Proxy timeout after 15s');
            }

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

            // ✅ FIX [React error #185]: Проверить mounted перед изменением audio
            if (!isMountedRef.current) {
              URL.revokeObjectURL(objectUrl);
              return;
            }

            audio.src = objectUrl;
            audio.load();

            try {
              await audio.play();
            } catch (e) {
              logger.error('Failed to play object URL audio', e as Error, 'AudioController', { trackId: currentTrack?.id });
            }

            // ✅ FIX [React error #185]: Проверить mounted перед toast
            if (isMountedRef.current) {
              toast.success('Аудио готово к воспроизведению', { id: loadingToastId });
            }
            return;
          } catch (e) {
            // ✅ FIX [React error #185]: Игнорировать abort errors
            // HOW: AbortController.abort() бросает AbortError, это нормальное поведение при unmount
            if ((e as Error).name === 'AbortError') {
              logger.debug('Proxy request aborted', 'AudioController');
              return;
            }

            logger.error('Proxy audio fallback failed', e as Error, 'AudioController', { trackId: currentTrack?.id });

            // ✅ FIX [React error #185]: Проверить mounted перед toast и pause
            if (!isMountedRef.current) {
              return;
            }

            // ✅ P2 FIX: Update loading toast to error with specific message
            const isTimeout = (e as Error).message?.includes('timeout');
            const errorMsg = isTimeout
              ? 'Не удалось подготовить аудио: превышено время ожидания'
              : (errorCode ? errorMessages[errorCode] || 'Не удалось подготовить аудио' : 'Не удалось подготовить аудио');
            toast.error(errorMsg, { id: loadingToastId });
            latestActions.current.pause();
          } finally {
            proxyAbortControllerRef.current = null;
          }
        })();
        return;
      }

      const userMessage = errorCode ? errorMessages[errorCode] || 'Ошибка загрузки аудио' : 'Ошибка загрузки аудио';

      // ✅ FIX [React error #185]: Проверить mounted перед toast и pause
      if (isMountedRef.current) {
        toast.error(userMessage);
        latestActions.current.pause();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('error', handleError);

    return () => {
      // ✅ FIX [React error #185]: Установить unmounted флаг ПЕРЕД cleanup
      // WHY: Все event handlers проверяют этот флаг перед setState
      isMountedRef.current = false;

      // ✅ FIX [React error #185]: Отменить активный proxy запрос
      // HOW: AbortController прервет fetch и установит флаг aborted
      if (proxyAbortControllerRef.current) {
        proxyAbortControllerRef.current.abort();
        proxyAbortControllerRef.current = null;
      }

      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('error', handleError);
    };
  }, [audioRef, currentTrack]); // Зависимости теперь безопасны

  // ============= ПРЕДЗАГРУЗКА СЛЕДУЮЩЕГО ТРЕКА =============
  const nextTrackInQueue = useRef<HTMLAudioElement | null>(null);
  const queue = useAudioPlayerStore((state) => state.queue);
  const currentQueueIndex = useAudioPlayerStore((state) => state.currentQueueIndex);
  const isShuffleEnabled = useAudioPlayerStore((state) => state.isShuffleEnabled);
  const shuffleHistory = useAudioPlayerStore((state) => state.shuffleHistory);

  useEffect(() => {
    if (!nextTrackInQueue.current) {
      nextTrackInQueue.current = new Audio();
      nextTrackInQueue.current.preload = 'auto';
    }

    // Определяем следующий трек для предзагрузки
    let nextTrack: AudioPlayerTrack | null = null;

    if (isShuffleEnabled && queue.length > 0) {
      // В shuffle mode берем случайный трек из непроигранных
      const unplayedTracks = queue.filter(
        (track) => !shuffleHistory.includes(track.id)
      );
      if (unplayedTracks.length > 0) {
        nextTrack = unplayedTracks[0]; // Берем первый непроигранный для предзагрузки
      }
    } else if (currentQueueIndex >= 0 && currentQueueIndex < queue.length - 1) {
      // В обычном режиме берем следующий по индексу
      nextTrack = queue[currentQueueIndex + 1];
    }

    // Предзагружаем следующий трек
    if (nextTrack?.audio_url && nextTrackInQueue.current) {
      try {
        nextTrackInQueue.current.src = nextTrack.audio_url;
        logger.info('Preloading next track', 'AudioController', {
          nextTrackId: nextTrack.id,
          nextTrackTitle: nextTrack.title,
        });
      } catch (error) {
        logger.error('Failed to preload next track', error as Error, 'AudioController', {
          nextTrackId: nextTrack?.id,
        });
      }
    }

    return () => {
      // Cleanup при размонтировании
      if (nextTrackInQueue.current) {
        nextTrackInQueue.current.src = '';
      }
    };
  }, [queue, currentQueueIndex, isShuffleEnabled, shuffleHistory]);

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
