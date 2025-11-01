/**
 * Audio Preloader Hook
 * Week 3: Smart Loading & Caching
 * 
 * Preloads next audio tracks in queue for seamless playback
 */

import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

interface UseAudioPreloaderOptions {
  enabled?: boolean;
  maxPreload?: number;
}

export const useAudioPreloader = (
  audioUrls: string[],
  currentIndex: number,
  options: UseAudioPreloaderOptions = {}
) => {
  const { enabled = true, maxPreload = 2 } = options;
  const preloadedAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!enabled || audioUrls.length === 0) return;

    const preloadAudio = (url: string) => {
      // Skip if already preloaded
      if (preloadedAudioRefs.current.has(url)) {
        return;
      }

      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = url;

        // Store reference
        preloadedAudioRefs.current.set(url, audio);

        logger.info(`[AudioPreloader] Preloading: ${url}`);

        // Load the audio
        audio.load();

        // Clean up on error
        audio.addEventListener('error', () => {
          logger.error(`[AudioPreloader] Failed to preload: ${url}`);
          preloadedAudioRefs.current.delete(url);
        });
      } catch (error) {
        logger.error('[AudioPreloader] Preload error:', error as Error);
      }
    };

    // Preload next N tracks
    const startIndex = currentIndex + 1;
    const endIndex = Math.min(startIndex + maxPreload, audioUrls.length);

    for (let i = startIndex; i < endIndex; i++) {
      const url = audioUrls[i];
      if (url) {
        preloadAudio(url);
      }
    }

    // Cleanup old preloaded audio (keep only current + next N)
    const relevantUrls = new Set(
      audioUrls.slice(currentIndex, endIndex)
    );

    for (const [preloadedUrl, audio] of preloadedAudioRefs.current.entries()) {
      if (!relevantUrls.has(preloadedUrl)) {
        audio.pause();
        audio.src = '';
        preloadedAudioRefs.current.delete(preloadedUrl);
        logger.info(`[AudioPreloader] Cleaned up: ${preloadedUrl}`);
      }
    }
  }, [audioUrls, currentIndex, enabled, maxPreload]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const audio of preloadedAudioRefs.current.values()) {
        audio.pause();
        audio.src = '';
      }
      preloadedAudioRefs.current.clear();
    };
  }, []);

  return {
    preloadedCount: preloadedAudioRefs.current.size,
    isPreloaded: (url: string) => preloadedAudioRefs.current.has(url),
  };
};
