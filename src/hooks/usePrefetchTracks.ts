/**
 * usePrefetchTracks - Prefetch adjacent tracks for smooth navigation
 * Preloads audio metadata for next/previous tracks in queue
 */

import { useEffect, useRef } from 'react';
import type { DisplayTrack } from '@/types/track';

interface UsePrefetchTracksOptions {
  enabled?: boolean;
  prefetchCount?: number; // Number of tracks to prefetch ahead/behind
}

export const usePrefetchTracks = (
  tracks: DisplayTrack[],
  currentTrackId: string | null,
  options: UsePrefetchTracksOptions = {}
) => {
  const { enabled = true, prefetchCount = 2 } = options;
  const prefetchedUrls = useRef<Set<string>>(new Set());
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!enabled || !currentTrackId || tracks.length === 0) return;

    const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex === -1) return;

    // Calculate range to prefetch
    const startIndex = Math.max(0, currentIndex - prefetchCount);
    const endIndex = Math.min(tracks.length - 1, currentIndex + prefetchCount);

    // Prefetch tracks in range
    for (let i = startIndex; i <= endIndex; i++) {
      const track = tracks[i];
      
      if (!track?.audio_url || prefetchedUrls.current.has(track.audio_url)) {
        continue;
      }

      // Create audio element for preloading
      const audio = new Audio();
      audio.preload = 'metadata'; // Only load metadata, not full audio
      audio.src = track.audio_url;

      // Store in cache
      audioCache.current.set(track.audio_url, audio);
      prefetchedUrls.current.add(track.audio_url);
    }

    // Захватываем текущие значения ref в локальные переменные,
    // чтобы cleanup работал с стабильными ссылками и удовлетворял eslint-plugin-react-hooks.
    const audioCacheRef = audioCache.current;
    const prefetchedUrlsRef = prefetchedUrls.current;

    // Cleanup old cached audio (keep only recent ones)
    return () => {
      if (audioCacheRef.size > prefetchCount * 4) {
        const urlsToDelete = Array.from(audioCacheRef.keys()).slice(0, audioCacheRef.size - prefetchCount * 3);
        urlsToDelete.forEach(url => {
          const audio = audioCacheRef.get(url);
          if (audio) {
            audio.src = ''; // Release resources
            audioCacheRef.delete(url);
            prefetchedUrlsRef.delete(url);
          }
        });
      }
    };
  }, [tracks, currentTrackId, enabled, prefetchCount]);

  return {
    prefetchedCount: prefetchedUrls.current.size,
    clearCache: () => {
      audioCache.current.forEach(audio => {
        audio.src = '';
      });
      audioCache.current.clear();
      prefetchedUrls.current.clear();
    },
  };
};
