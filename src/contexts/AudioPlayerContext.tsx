import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';

interface Track {
  id: string;
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
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
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

  const playTrack = (track: Track) => {
    if (!track.audio_url) return;
    
    const audio = audioRef.current;
    audio.src = track.audio_url;
    audio.load();
    audio.play().catch(err => console.error('Error playing track:', err));
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.error('Error playing:', err));
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
    
    const currentIndex = currentTrack 
      ? queue.findIndex(t => t.id === currentTrack.id)
      : -1;
    
    const nextIndex = (currentIndex + 1) % queue.length;
    playTrack(queue[nextIndex]);
  };

  const playPrevious = () => {
    if (queue.length === 0) return;
    
    const currentIndex = currentTrack 
      ? queue.findIndex(t => t.id === currentTrack.id)
      : -1;
    
    const previousIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    playTrack(queue[previousIndex]);
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => {
      if (prev.find(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };

  const clearQueue = () => {
    setQueue([]);
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
        playTrack,
        togglePlayPause,
        seekTo,
        setVolume,
        playNext,
        playPrevious,
        addToQueue,
        clearQueue,
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
