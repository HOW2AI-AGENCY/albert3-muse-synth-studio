/**
 * Keyboard shortcuts for desktop player
 *
 * ✅ FIX: Subscribes to store internally to prevent parent re-renders
 * This prevents infinite re-render loops caused by 60 FPS updates
 */
import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

interface UsePlayerKeyboardShortcutsProps {
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute?: () => void;
  toggleRepeatMode?: () => void;
  toggleShuffle?: () => void;
}

export const usePlayerKeyboardShortcuts = ({
  togglePlayPause,
  seekTo,
  setVolume,
  toggleMute,
  toggleRepeatMode,
  toggleShuffle,
}: UsePlayerKeyboardShortcutsProps) => {
  const isMobile = useIsMobile();

  // ✅ Subscribe to store internally using refs
  // This prevents parent component from re-rendering on every currentTime/volume change
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const volumeRef = useRef(0);

  // Subscribe directly to store and update refs (no parent re-render!)
  useEffect(() => {
    const unsubscribe = useAudioPlayerStore.subscribe((state) => {
      currentTimeRef.current = state.currentTime;
      durationRef.current = state.duration;
      volumeRef.current = state.volume;
    });

    // Initialize refs with current values
    const state = useAudioPlayerStore.getState();
    currentTimeRef.current = state.currentTime;
    durationRef.current = state.duration;
    volumeRef.current = state.volume;

    return unsubscribe;
  }, []);

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
          // ✅ Use refs instead of closures
          seekTo(Math.min(currentTimeRef.current + 10, durationRef.current));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(Math.max(currentTimeRef.current - 10, 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(volumeRef.current + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(volumeRef.current - 0.1, 0));
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
    // ✅ Removed currentTime, duration, volume from dependencies
    // Event listener will NOT be recreated on every frame
    isMobile,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeatMode,
    toggleShuffle,
  ]);
};
