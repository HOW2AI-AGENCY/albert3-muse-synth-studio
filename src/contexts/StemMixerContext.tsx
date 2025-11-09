import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { logger, logError } from '@/utils/logger';
import { StemMixerContext, TrackStem } from './stem-mixer/context';

// Контекст и типы вынесены в отдельный модуль ./stem-mixer/context

interface StemMixerProviderProps {
  children: React.ReactNode;
}

export const StemMixerProvider = ({ children }: StemMixerProviderProps) => {
  const [activeStemIds, setActiveStemIds] = useState<Set<string>>(new Set());
  const [stemVolumes, setStemVolumes] = useState<Map<string, number>>(new Map());
  const [stemMuted, setStemMuted] = useState<Map<string, boolean>>(new Map());
  const [soloStemId, setSoloStemId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(1.0);

  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timeUpdateIntervalRef = useRef<number | null>(null);

  const loadStems = useCallback((stems: TrackStem[]) => {
    // Clear existing audio elements
    audioElementsRef.current.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    audioElementsRef.current.clear();

    // Create new audio elements
    const newActiveStemIds = new Set<string>();
    const newVolumes = new Map<string, number>();
    const newMuted = new Map<string, boolean>();

    stems.forEach(stem => {
      const audio = new Audio(stem.audio_url);
      audio.preload = 'metadata';
      
      // ✅ FIX: Add CORS settings for Mureka stems
      audio.crossOrigin = 'anonymous';
      
      audioElementsRef.current.set(stem.id, audio);
      
      // Initialize all stems as active
      newActiveStemIds.add(stem.id);
      newVolumes.set(stem.id, 0.7); // 70% default volume
      newMuted.set(stem.id, false);

      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && audio.duration > duration) {
          setDuration(audio.duration);
        }
      });
      
      // ✅ FIX: Add error handling for loading failures
      audio.addEventListener('error', (e) => {
        const audioError = (e.target as HTMLAudioElement).error;
        logError(`Audio loading failed for stem ${stem.stem_type}`, new Error(audioError?.message || 'Unknown audio error'), 'StemMixerContext');
      });
    });

    setActiveStemIds(newActiveStemIds);
    setStemVolumes(newVolumes);
    setStemMuted(newMuted);
    setSoloStemId(null);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [duration]);

  const toggleStem = useCallback((stemId: string) => {
    setActiveStemIds(prev => {
      const next = new Set(prev);
      if (next.has(stemId)) {
        next.delete(stemId);
      } else {
        next.add(stemId);
      }
      return next;
    });
  }, []);

  const setStemVolume = useCallback((stemId: string, volume: number) => {
    setStemVolumes(prev => {
      const next = new Map(prev);
      next.set(stemId, volume);
      return next;
    });
  }, []);

  const toggleStemMute = useCallback((stemId: string) => {
    setStemMuted(prev => {
      const next = new Map(prev);
      next.set(stemId, !prev.get(stemId));
      return next;
    });
  }, []);

  const setSolo = useCallback((stemId: string | null) => {
    setSoloStemId(stemId);
  }, []);

  // Переносим pause выше play, чтобы не использовать переменную до её объявления
  const pause = useCallback(() => {
    audioElementsRef.current.forEach(audio => {
      audio.pause();
    });
    setIsPlaying(false);

    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  const play = useCallback(async () => {
    try {
      const playPromises: Promise<void>[] = [];

      audioElementsRef.current.forEach((audio, stemId) => {
        const isActive = activeStemIds.has(stemId);
        const isMuted = stemMuted.get(stemId) || false;
        const isSoloed = soloStemId ? soloStemId === stemId : true;
        const volume = stemVolumes.get(stemId) || 0.7;

        if (isActive && isSoloed && !isMuted) {
          audio.volume = volume * masterVolume;
          audio.currentTime = currentTime;
          playPromises.push(audio.play());
        } else {
          audio.volume = 0;
          audio.pause();
        }
      });

      await Promise.all(playPromises);
      setIsPlaying(true);

      // Start time update interval
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      timeUpdateIntervalRef.current = window.setInterval(() => {
        const firstAudio = Array.from(audioElementsRef.current.values())[0];
        if (firstAudio) {
          setCurrentTime(firstAudio.currentTime);
          if (firstAudio.currentTime >= firstAudio.duration) {
            pause();
          }
        }
      }, 100);
    } catch (error) {
      logger.error('Error playing stems', error instanceof Error ? error : new Error(String(error)), 'StemMixerContext');
      toast.error('Ошибка воспроизведения стемов');
    }
  }, [activeStemIds, stemMuted, soloStemId, stemVolumes, currentTime, masterVolume, pause]);

  const seekTo = useCallback((time: number) => {
    audioElementsRef.current.forEach(audio => {
      audio.currentTime = time;
    });
    setCurrentTime(time);
  }, []);

  const resetAll = useCallback(() => {
    pause();
    seekTo(0);
    
    // Reset to default state
    const allIds = Array.from(audioElementsRef.current.keys());
    setActiveStemIds(new Set(allIds));
    
    const defaultVolumes = new Map<string, number>();
    const defaultMuted = new Map<string, boolean>();
    allIds.forEach(id => {
      defaultVolumes.set(id, 0.7);
      defaultMuted.set(id, false);
    });
    
    setStemVolumes(defaultVolumes);
    setStemMuted(defaultMuted);
    setSoloStemId(null);
    setMasterVolume(1.0);
  }, [pause, seekTo]);

  // Update audio volumes when mute/solo/master state changes
  useEffect(() => {
    audioElementsRef.current.forEach((audio, stemId) => {
      const isActive = activeStemIds.has(stemId);
      const isMuted = stemMuted.get(stemId) || false;
      const isSoloed = soloStemId ? soloStemId === stemId : true;
      const volume = stemVolumes.get(stemId) || 0.7;

      if (isPlaying && isActive && isSoloed && !isMuted) {
        audio.volume = volume * masterVolume;
      } else if (isPlaying) {
        audio.volume = 0;
      }
    });
  }, [activeStemIds, stemMuted, soloStemId, stemVolumes, masterVolume, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    // Захватываем текущую ссылку на карту аудио-элементов,
    // чтобы избежать предупреждений exhaustive-deps и использовать стабильную ссылку в cleanup
    const audioElementsMapRef = audioElementsRef.current;
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      audioElementsMapRef.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioElementsMapRef.clear();
    };
  }, []);

  return (
    <StemMixerContext.Provider
      value={{
        activeStemIds,
        stemVolumes,
        stemMuted,
        soloStemId,
        isPlaying,
        currentTime,
        duration,
        masterVolume,
        loadStems,
        toggleStem,
        setStemVolume,
        toggleStemMute,
        setSolo,
        setMasterVolume,
        play,
        pause,
        seekTo,
        resetAll,
      }}
    >
      {children}
    </StemMixerContext.Provider>
  );
};
