import { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { usePlayAnalytics } from '@/hooks/usePlayAnalytics';
import { logError, logInfo } from '@/utils/logger';
import { cacheAudioFile } from '../utils/serviceWorker';
import { AudioPlayerTrack } from '@/types/track';

interface AudioPlayerContextType {
  currentTrack: AudioPlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: AudioPlayerTrack[];
  currentQueueIndex: number;
  playTrack: (track: AudioPlayerTrack) => void;
  playTrackWithQueue: (track: AudioPlayerTrack, allTracks: AudioPlayerTrack[]) => void;
  togglePlayPause: () => void;
  pauseTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: AudioPlayerTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  switchToVersion: (versionId: string) => void;
  getAvailableVersions: () => AudioPlayerTrack[];
  currentVersionIndex: number;
  audioRef: React.RefObject<HTMLAudioElement>;
  clearCurrentTrack: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<AudioPlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<AudioPlayerTrack[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { playTime, hasRecorded } = usePlayAnalytics(currentTrack?.id || null, isPlaying, currentTime);

  // Мемоизированная функция воспроизведения трека
  const playTrack = useCallback(async (track: AudioPlayerTrack) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setCurrentTrack(track);
      setIsPlaying(false);

      if (audioRef.current && track.audio_url) {
        audioRef.current.src = track.audio_url;
        
        try {
          await cacheAudioFile(track.audio_url);
        } catch (error) {
          logError('Failed to cache audio file', error as Error, track.id);
        }

        try {
          await audioRef.current.play();
          setIsPlaying(true);
          
          // Аналитика воспроизведения обрабатывается автоматически хуком usePlayAnalytics
        } catch (error) {
          logError('Failed to play track', error as Error, track.id);
        }
      }
    } catch (error) {
      logError('Error in playTrack', error as Error, track.id);
    }
  }, []);

  // Мемоизированная функция воспроизведения трека с очередью
  const playTrackWithQueue = useCallback((track: AudioPlayerTrack, allTracks: AudioPlayerTrack[]) => {
    setQueue(allTracks);
    const trackIndex = allTracks.findIndex(t => t.id === track.id);
    setCurrentQueueIndex(trackIndex);
    playTrack(track);
  }, [playTrack]);

  // Мемоизированная функция переключения воспроизведения/паузы
  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          logError('Failed to play/pause track', error as Error);
        });
      }
    }
  }, [isPlaying]);

  // Мемоизированная функция паузы
  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Мемоизированная функция перемотки
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Мемоизированная функция установки громкости
  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolumeState(newVolume);
    }
  }, []);

  // Мемоизированная функция следующего трека
  const playNext = useCallback(() => {
    if (queue.length > 0 && currentQueueIndex < queue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      setCurrentQueueIndex(nextIndex);
      playTrack(queue[nextIndex]);
    }
  }, [queue, currentQueueIndex, playTrack]);

  // Мемоизированная функция предыдущего трека
  const playPrevious = useCallback(() => {
    if (queue.length > 0 && currentQueueIndex > 0) {
      const prevIndex = currentQueueIndex - 1;
      setCurrentQueueIndex(prevIndex);
      playTrack(queue[prevIndex]);
    }
  }, [queue, currentQueueIndex, playTrack]);

  // Мемоизированная функция добавления в очередь
  const addToQueue = useCallback((track: AudioPlayerTrack) => {
    setQueue(prev => [...prev, track]);
  }, []);

  // Мемоизированная функция удаления из очереди
  const removeFromQueue = useCallback((trackId: string) => {
    setQueue(prev => prev.filter(track => track.id !== trackId));
  }, []);

  // Мемоизированная функция очистки очереди
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentQueueIndex(-1);
  }, []);

  // Мемоизированная функция изменения порядка в очереди
  const reorderQueue = useCallback((startIndex: number, endIndex: number) => {
    setQueue(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const clearCurrentTrack = useCallback(() => {
    setCurrentTrack(null);
    setQueue([]);
    setCurrentQueueIndex(-1);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  // Мемоизированная функция получения доступных версий
  const getAvailableVersions = useCallback((): AudioPlayerTrack[] => {
    if (!currentTrack) return [];
    
    return queue.filter(track => 
      track.parentTrackId === currentTrack.parentTrackId || 
      track.id === currentTrack.parentTrackId ||
      currentTrack.id === track.parentTrackId
    );
  }, [currentTrack, queue]);

  // Мемоизированная функция переключения версии
  const switchToVersion = useCallback((versionId: string) => {
    const versions = getAvailableVersions();
    const version = versions.find(v => v.id === versionId);
    
    if (version) {
      const versionIndex = versions.findIndex(v => v.id === versionId);
      setCurrentVersionIndex(versionIndex);
      
      if (isPlaying) {
        playTrack(version).then(() => {
          // Аналитика переключения версий обрабатывается автоматически хуком usePlayAnalytics
          setIsPlaying(false);
        });
      }
    }
  }, [getAvailableVersions, isPlaying, playTrack]);

  // Обработчики событий аудио элемента
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [playNext]);

  // Мемоизированное значение контекста
  const contextValue = useMemo(() => ({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    currentQueueIndex,
    playTrack,
    playTrackWithQueue,
    togglePlayPause,
    pauseTrack,
    seekTo,
    setVolume,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    switchToVersion,
    getAvailableVersions,
    currentVersionIndex,
    audioRef,
    clearCurrentTrack,
  }), [
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    currentQueueIndex,
    playTrack,
    playTrackWithQueue,
    togglePlayPause,
    pauseTrack,
    seekTo,
    setVolume,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    switchToVersion,
    getAvailableVersions,
    currentVersionIndex,
    clearCurrentTrack,
  ]);

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      <audio ref={audioRef} />
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
};
