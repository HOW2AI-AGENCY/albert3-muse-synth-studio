/**
 * AudioController - Refactored for Sliced Zustand Store
 * Manages the <audio> element, reacting to store changes and dispatching updates.
 * Integrates with useTrackVersions to decouple data fetching from the store.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import type { AudioPlayerTrack } from '@/types/track.types';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { useTrackVersions } from '@/features/tracks/api/useTrackVersions';
import { trackConverters } from '@/types/domain/track.types';

export const AudioController = () => {
  // --- STATE SELECTION ---
  // Select state and actions from the store.
  // Using a single selector is often more performant.
  const {
    currentTrack,
    isPlaying,
    volume,
    queue,
    currentQueueIndex,
    isShuffleEnabled,
    shuffleHistory,
    actions,
  } = useAudioPlayerStore(
    (state) => ({
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      volume: state.volume,
      queue: state.queue,
      currentQueueIndex: state.currentQueueIndex,
      isShuffleEnabled: state.isShuffleEnabled,
      shuffleHistory: state.shuffleHistory,
      actions: {
        updateCurrentTime: state.updateCurrentTime,
        updateDuration: state.updateDuration,
        updateBufferingProgress: state.updateBufferingProgress,
        pause: state.pause,
        resume: state.resume,
        playNext: state.playNext,
        playPrevious: state.playPrevious,
        seekTo: state.seekTo,
        _setVersions: state._setVersions,
      },
    })
  );

  const audioRef = useRef<HTMLAudioElement>(null);

  // --- DATA FETCHING FOR VERSIONS ---
  const parentTrackId = currentTrack?.parentTrackId ?? currentTrack?.id;
  const { data: versionsData, error: versionsError } = useTrackVersions(parentTrackId, {
    enabled: !!parentTrackId,
  });

  useEffect(() => {
    if (versionsData) {
      const versions = [
        trackConverters.toTrackVersion(versionsData.mainTrack),
        ...versionsData.variants.map(trackConverters.toTrackVersion),
      ].filter((v): v is NonNullable<typeof v> => v !== null);

      actions._setVersions(versions, versionsData.preferredVariant?.id);
    }
    if (versionsError) {
      logger.error('Failed to load track versions in AudioController', versionsError, 'AudioController', { parentTrackId });
    }
  }, [versionsData, versionsError, actions._setVersions, parentTrackId]);


  // --- REFS FOR STABLE CALLBACKS AND STATE ---
  const isSettingSourceRef = useRef(false);
  const playLockRef = useRef(false);
  const lastLoadedTrackIdRef = useRef<string | null>(null);
  const retryTimeoutIdRef = useRef<number | null>(null);
  const mediaSessionSetRef = useRef(false);
  const isMountedRef = useRef(true);
  const proxyAbortControllerRef = useRef<AbortController | null>(null);
  const proxyTriedRef = useRef<Record<string, boolean>>({});
  const retryCountRef = useRef(0);

  // Use a ref to hold the latest actions to prevent useEffect dependency issues
  const latestActions = useRef(actions);
  useEffect(() => {
    latestActions.current = actions;
  });

  // --- CORE PLAYBACK LOGIC ---

  const safePlay = useCallback(async () => {
    const audio = audioRef?.current;
    if (!audio) return;
    if (isSettingSourceRef.current || playLockRef.current) return;

    playLockRef.current = true;
    try {
      if (audio.readyState < 3) {
        await new Promise<void>((resolve) => {
          const onReady = () => resolve();
          audio.addEventListener('canplay', onReady, { once: true });
          setTimeout(onReady, 1500); // Failsafe
        });
      }
      await audio.play();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        logger.error('Failed to play audio', error as Error, 'AudioController', { trackId: currentTrack?.id });
      }
    } finally {
      playLockRef.current = false;
    }
  }, [audioRef, currentTrack?.id]);

  // Effect to handle play/pause state
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    if (isPlaying && currentTrack) {
      safePlay();
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack, safePlay]);

  // Effect to handle track source changes
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio || !currentTrack?.audio_url) return;

    // Prevent re-triggering for the same track URL
    if (lastLoadedTrackIdRef.current === currentTrack.id) return;

    // --- RESET STATE FOR NEW TRACK ---
    lastLoadedTrackIdRef.current = currentTrack.id;
    isSettingSourceRef.current = true;
    retryCountRef.current = 0; // Reset retry count
    if (retryTimeoutIdRef.current) {
      clearTimeout(retryTimeoutIdRef.current); // Clear any pending retry
      retryTimeoutIdRef.current = null;
    }
    if (proxyAbortControllerRef.current) {
      proxyAbortControllerRef.current.abort(); // Abort any pending proxy request
      proxyAbortControllerRef.current = null;
    }

    try {
      audio.src = currentTrack.audio_url;
      audio.load();
      actions.updateCurrentTime(0);
    } catch (error) {
      logger.error('Failed to set audio source', error as Error, 'AudioController', { trackId: currentTrack.id });
    } finally {
      isSettingSourceRef.current = false;
    }

    const handleLoadedMetadata = () => {
      if (!isMountedRef.current) return;
      actions.updateDuration(audio.duration || 0);
      if (isPlaying) {
        safePlay();
      }
    };
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentTrack?.id, currentTrack?.audio_url, isPlaying, actions, safePlay]);

  // Effect for volume
  useEffect(() => {
    const audio = audioRef?.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  // Effect to manage component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // --- ERROR HANDLING & RESILIENCE ---
  const handleError = useCallback(() => {
    if (!isMountedRef.current || !currentTrack?.audio_url || !audioRef.current) return;

    const audio = audioRef.current;
    const mediaError = audio.error;
    if (!mediaError || mediaError.code === mediaError.MEDIA_ERR_ABORTED) {
      return;
    }

    logger.warn('Audio playback error', {
      code: mediaError.code,
      message: mediaError.message,
      trackId: currentTrack.id,
      audio_url: currentTrack.audio_url,
      retryCount: retryCountRef.current,
    });

    const maxRetries = 3;
    const initialRetryDelay = 1000; // ms

    // --- RETRY LOGIC ---
    if (retryCountRef.current < maxRetries) {
      if (retryTimeoutIdRef.current) {
        clearTimeout(retryTimeoutIdRef.current);
      }
      const delay = initialRetryDelay * Math.pow(2, retryCountRef.current);
      retryCountRef.current += 1;
      logger.info(`Retrying audio load in ${delay}ms...`, { attempt: retryCountRef.current });

      retryTimeoutIdRef.current = window.setTimeout(() => {
        if (isMountedRef.current && audioRef.current) {
          logger.info(`Executing retry attempt #${retryCountRef.current}`);
          audioRef.current.load();
          safePlay();
        }
      }, delay);
      return;
    }

    // --- PROXY FALLBACK LOGIC ---
    if (currentTrack.id && !proxyTriedRef.current[currentTrack.id]) {
      proxyTriedRef.current[currentTrack.id] = true;
      logger.info('All retries failed. Attempting to use proxy.', { trackId: currentTrack.id });
      toast.info('Проблемы с загрузкой трека. Пробуем альтернативный маршрут...');

      if (proxyAbortControllerRef.current) {
        proxyAbortControllerRef.current.abort();
      }
      proxyAbortControllerRef.current = new AbortController();
      const signal = proxyAbortControllerRef.current.signal;

      SupabaseFunctions.getProxyUrl({ url: currentTrack.audio_url }, signal)
        .then(proxyUrl => {
          if (signal.aborted || !isMountedRef.current || !audioRef.current) return;
          logger.info('Received proxy URL. Applying to audio element.', { proxyUrl });
          retryCountRef.current = 0;
          isSettingSourceRef.current = true;
          audioRef.current.src = proxyUrl;
          audioRef.current.load();
          safePlay();
          isSettingSourceRef.current = false;
        })
        .catch(error => {
          if (signal.aborted) {
            logger.info('Proxy request was aborted.');
            return;
          }
          logger.error('Failed to get proxy URL', error, 'AudioController');
          toast.error('Не удалось загрузить трек даже через прокси.');
          latestActions.current.pause();
        });
      return;
    }

    // --- FINAL FAILURE ---
    logger.error('Audio playback failed after all retries and proxy attempt.', { trackId: currentTrack.id });
    toast.error('Не удалось загрузить трек. Попробуйте следующий.');
    latestActions.current.pause();
  }, [currentTrack, safePlay]);

  // Effect for wiring up all audio element events
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handleTimeUpdate = () => isMountedRef.current && latestActions.current.updateCurrentTime(audio.currentTime);
    const handleEnded = () => isMountedRef.current && latestActions.current.playNext();
    const handleProgress = () => {
      if (isMountedRef.current && audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        latestActions.current.updateBufferingProgress((bufferedEnd / audio.duration) * 100);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('error', handleError);
    };
  }, [audioRef, handleError]);


  // --- MEDIASESSION API ---
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.style_tags?.[0] || 'AI Music',
      album: 'Albert3 Muse Synth Studio',
      artwork: currentTrack.cover_url ? [{ src: currentTrack.cover_url }] : [],
    });

    // Use latest actions from ref to avoid re-binding handlers
    const setupMediaActions = () => {
      if (mediaSessionSetRef.current) return;
      navigator.mediaSession.setActionHandler('play', () => latestActions.current.resume());
      navigator.mediaSession.setActionHandler('pause', () => latestActions.current.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => latestActions.current.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => latestActions.current.playNext());
      navigator.mediaSession.setActionHandler('seekto', (d) => d.seekTime && latestActions.current.seekTo(d.seekTime));
      mediaSessionSetRef.current = true;
    };
    setupMediaActions();

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

  }, [currentTrack, isPlaying]);


  return <audio ref={audioRef} preload="auto" crossOrigin="anonymous" className="hidden" />;
};
