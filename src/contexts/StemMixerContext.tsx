import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
}

interface StemMixerContextType {
  activeStemIds: Set<string>;
  stemVolumes: Map<string, number>;
  stemMuted: Map<string, boolean>;
  soloStemId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loadStems: (stems: TrackStem[]) => void;
  toggleStem: (stemId: string) => void;
  setStemVolume: (stemId: string, volume: number) => void;
  toggleStemMute: (stemId: string) => void;
  setSolo: (stemId: string | null) => void;
  play: () => Promise<void>;
  pause: () => void;
  seekTo: (time: number) => void;
  resetAll: () => void;
}

const StemMixerContext = createContext<StemMixerContextType | undefined>(undefined);

export const useStemMixer = () => {
  const context = useContext(StemMixerContext);
  if (!context) {
    throw new Error('useStemMixer must be used within StemMixerProvider');
  }
  return context;
};

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

    const audio = audioElementsRef.current.get(stemId);
    if (audio) {
      audio.volume = volume;
    }
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

  const play = useCallback(async () => {
    try {
      const playPromises: Promise<void>[] = [];

      audioElementsRef.current.forEach((audio, stemId) => {
        const isActive = activeStemIds.has(stemId);
        const isMuted = stemMuted.get(stemId) || false;
        const isSoloed = soloStemId ? soloStemId === stemId : true;
        const volume = stemVolumes.get(stemId) || 0.7;

        if (isActive && isSoloed && !isMuted) {
          audio.volume = volume;
          audio.currentTime = currentTime;
          playPromises.push(audio.play());
        } else {
          audio.volume = 0;
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
      console.error('Error playing stems:', error);
      toast.error('Ошибка воспроизведения стемов');
    }
  }, [activeStemIds, stemMuted, soloStemId, stemVolumes, currentTime]);

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
  }, [pause, seekTo]);

  // Update audio volumes when mute/solo state changes
  useEffect(() => {
    audioElementsRef.current.forEach((audio, stemId) => {
      const isActive = activeStemIds.has(stemId);
      const isMuted = stemMuted.get(stemId) || false;
      const isSoloed = soloStemId ? soloStemId === stemId : true;
      const volume = stemVolumes.get(stemId) || 0.7;

      if (isPlaying && isActive && isSoloed && !isMuted) {
        audio.volume = volume;
      } else if (isPlaying) {
        audio.volume = 0;
      }
    });
  }, [activeStemIds, stemMuted, soloStemId, stemVolumes, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      audioElementsRef.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioElementsRef.current.clear();
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
        loadStems,
        toggleStem,
        setStemVolume,
        toggleStemMute,
        setSolo,
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
