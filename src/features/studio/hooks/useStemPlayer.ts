// src/features/studio/hooks/useStemPlayer.ts
import { useEffect, useRef, useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';

/**
 * useStemPlayer
 *
 * This hook manages the audio playback for all the stems in the studio.
 * It creates and synchronizes multiple HTMLAudioElement instances based on the
 * stems defined in the useStudioStore. It handles play, pause, volume changes,
 * mute/solo logic, and time synchronization.
 */
export const useStemPlayer = () => {
  const { stems, isPlaying, currentTime, setCurrentTime, updateStemVolume, toggleMute, toggleSolo } = useStudioStore();
  const audioElements = useRef<Map<string, HTMLAudioElement>>(new Map());
  const animationFrameId = useRef<number>();

  // Function to update the current time in the store
  const updateTime = useCallback(() => {
    const firstAudio = audioElements.current.values().next().value;
    if (firstAudio) {
      setCurrentTime(firstAudio.currentTime);
    }
    animationFrameId.current = requestAnimationFrame(updateTime);
  }, [setCurrentTime]);

  useEffect(() => {
    // Create and manage audio elements
    stems.forEach(stem => {
      if (!audioElements.current.has(stem.id)) {
        const audio = new Audio(stem.audioUrl);
        audio.loop = true;
        audioElements.current.set(stem.id, audio);
      }
    });

    // Cleanup unused audio elements
    audioElements.current.forEach((_, id) => {
      if (!stems.some(s => s.id === id)) {
        const audio = audioElements.current.get(id);
        if (audio) {
          audio.pause();
          audio.src = ''; // Release resource
        }
        audioElements.current.delete(id);
      }
    });
  }, [stems]);

  useEffect(() => {
    // Handle play/pause
    if (isPlaying) {
      audioElements.current.forEach(audio => {
        audio.play().catch(e => console.error("Audio play failed:", e));
      });
      animationFrameId.current = requestAnimationFrame(updateTime);
    } else {
      audioElements.current.forEach(audio => {
        audio.pause();
      });
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, updateTime]);

  useEffect(() => {
    // Synchronize currentTime when it changes in the store (e.g., seeking)
    audioElements.current.forEach(audio => {
      if (Math.abs(audio.currentTime - currentTime) > 0.1) {
        audio.currentTime = currentTime;
      }
    });
  }, [currentTime]);

  useEffect(() => {
    // Handle volume, mute, and solo logic
    const soloStem = stems.find(s => s.isSolo);
    stems.forEach(stem => {
      const audio = audioElements.current.get(stem.id);
      if (audio) {
        if (soloStem) {
          audio.muted = stem.id !== soloStem.id;
        } else {
          audio.muted = stem.isMuted;
        }
        audio.volume = stem.volume / 100;
      }
    });
  }, [stems]);

  return {
    updateStemVolume,
    toggleMute,
    toggleSolo,
  };
};
