/**
 * Keyboard shortcuts for desktop player
 */
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface UsePlayerKeyboardShortcutsProps {
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute?: () => void;
  toggleRepeatMode?: () => void;
  toggleShuffle?: () => void;
  currentTime: number;
  duration: number;
  volume: number;
}

export const usePlayerKeyboardShortcuts = ({
  togglePlayPause,
  seekTo,
  setVolume,
  toggleMute,
  toggleRepeatMode,
  toggleShuffle,
  currentTime,
  duration,
  volume,
}: UsePlayerKeyboardShortcutsProps) => {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo(Math.min(currentTime + 10, duration));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(Math.max(currentTime - 10, 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(volume + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(volume - 0.1, 0));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute?.();
          break;
        case 'KeyR':
          e.preventDefault();
          toggleRepeatMode?.();
          break;
        case 'KeyS':
          e.preventDefault();
          toggleShuffle?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMobile,
    togglePlayPause,
    currentTime,
    duration,
    seekTo,
    volume,
    setVolume,
    toggleMute,
    toggleRepeatMode,
    toggleShuffle,
  ]);
};
