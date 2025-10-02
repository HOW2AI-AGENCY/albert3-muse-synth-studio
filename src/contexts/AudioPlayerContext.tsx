import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { usePlayAnalytics } from '@/hooks/usePlayAnalytics';
import { logError, logInfo } from '@/utils/logger';

interface Track {
  id: string;
  parentTrackId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;
  title: string;
  audio_url: string;
  cover_url?: string;
  duration?: number;
  style_tags?: string[];
  lyrics?: string;
}

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Track[];
  currentQueueIndex: number;
  playTrack: (track: Track) => void;
  playTrackWithQueue: (track: Track, allTracks: Track[]) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  switchToVersion: (versionId: string) => void;
  getAvailableVersions: () => Track[];
  currentVersionIndex: number;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(new Audio());

  // Setup audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // Track play analytics
  usePlayAnalytics(
    currentTrack?.id || null,
    isPlaying,
    currentTime
  );

  const playTrack = (track: Track) => {
    if (!track.audio_url) return;
    
    const audio = audioRef.current;
    audio.src = track.audio_url;
    audio.load();
    audio.play().catch(err => logError('Ошибка воспроизведения трека', err as Error, 'AudioPlayerContext', {
        trackId: track.id,
        trackTitle: track.title
      }));
    setCurrentTrack(track);
    setIsPlaying(true);
    
    // Update queue index if track is in queue
    const trackIndex = queue.findIndex(t => t.id === track.id);
    if (trackIndex !== -1) {
      setCurrentQueueIndex(trackIndex);
    }
  };

  const playTrackWithQueue = (track: Track, allTracks: Track[]) => {
    if (!track.audio_url) return;
    
    // Filter only tracks with audio
    const playableTracks = allTracks.filter(t => t.audio_url);
    
    // Find the clicked track index
    const trackIndex = playableTracks.findIndex(t => t.id === track.id);
    
    if (trackIndex === -1) return;
    
    // Set queue and play
    setQueue(playableTracks);
    setCurrentQueueIndex(trackIndex);
    playTrack(track);
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => logError('Ошибка воспроизведения', err as Error, 'AudioPlayerContext', {
        currentTrackId: currentTrack?.id
      }));
    }
  };

  const seekTo = (time: number) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  };

  const playNext = () => {
    if (queue.length === 0) return;
    
    const nextIndex = (currentQueueIndex + 1) % queue.length;
    setCurrentQueueIndex(nextIndex);
    playTrack(queue[nextIndex]);
  };

  const playPrevious = () => {
    if (queue.length === 0) return;
    
    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      seekTo(0);
      return;
    }
    
    const previousIndex = currentQueueIndex <= 0 ? queue.length - 1 : currentQueueIndex - 1;
    setCurrentQueueIndex(previousIndex);
    playTrack(queue[previousIndex]);
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => {
      if (prev.find(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };

  const removeFromQueue = (trackId: string) => {
    setQueue(prev => {
      const newQueue = prev.filter(t => t.id !== trackId);
      // Adjust index if needed
      if (currentQueueIndex >= newQueue.length && newQueue.length > 0) {
        setCurrentQueueIndex(newQueue.length - 1);
      }
      return newQueue;
    });
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrentQueueIndex(0);
  };

  const reorderQueue = (startIndex: number, endIndex: number) => {
    setQueue(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Update current index if needed
      if (startIndex === currentQueueIndex) {
        setCurrentQueueIndex(endIndex);
      } else if (startIndex < currentQueueIndex && endIndex >= currentQueueIndex) {
        setCurrentQueueIndex(currentQueueIndex - 1);
      } else if (startIndex > currentQueueIndex && endIndex <= currentQueueIndex) {
        setCurrentQueueIndex(currentQueueIndex + 1);
      }
      
      return result;
    });
  };

  const switchToVersion = (versionId: string) => {
    const versions = getAvailableVersions();
    const versionIndex = versions.findIndex(v => v.id === versionId);
    
    if (versionIndex !== -1) {
      const version = versions[versionIndex];
      setCurrentVersionIndex(versionIndex);
      setCurrentTrack(version);
      
      const audio = audioRef.current;
      audio.src = version.audio_url;
      audio.load();
      
      if (isPlaying) {
        audio.play().catch(error => {
          logError('Ошибка воспроизведения версии', error as Error, 'AudioPlayerContext', {
            versionId,
            trackId: version.id,
            trackTitle: version.title
          });
          setIsPlaying(false);
        });
      }
    }
  };

  const getAvailableVersions = (): Track[] => {
    if (!currentTrack) return [];
    
    // Get parent track ID (current track's parent or itself if it's the parent)
    const parentId = currentTrack.parentTrackId || currentTrack.id;
    
    // Find all tracks in queue with the same parent
    const versions = queue.filter(track => {
      const trackParentId = track.parentTrackId || track.id;
      return trackParentId === parentId;
    });
    
    return versions;
  };

  return (
    <AudioPlayerContext.Provider
      value={{
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
      }}
    >
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
