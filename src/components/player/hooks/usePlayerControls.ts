/**
 * Player controls logic consolidation
 */
import { useCallback, useState } from 'react';
import { useAudioPlayerStore, useVolume } from '@/stores/audioPlayerStore';

export const usePlayerControls = () => {
  const volume = useVolume();
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const setVolume = useAudioPlayerStore((state) => state.setVolume);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const playPrevious = useAudioPlayerStore((state) => state.playPrevious);
  const clearCurrentTrack = useAudioPlayerStore((state) => state.clearCurrentTrack);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, setVolume, previousVolume, volume]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (newVolume > 0) setPreviousVolume(newVolume);
  }, [setVolume]);

  return {
    // State
    isMuted,
    previousVolume,
    
    // Controls
    togglePlayPause,
    seekTo,
    setVolume,
    playNext,
    playPrevious,
    clearCurrentTrack,
    toggleMute,
    handleVolumeChange,
  };
};
