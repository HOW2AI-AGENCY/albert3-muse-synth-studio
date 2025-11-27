/**
 * Hook для управления очередью воспроизведения
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioPlayerTrack } from '@/types/track.types';
import { logInfo } from '@/utils/logger';

export const useAudioQueue = () => {
  const [queue, setQueue] = useState<AudioPlayerTrack[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const preloadedTracksRef = useRef<Set<string>>(new Set());

  const addToQueue = useCallback((track: AudioPlayerTrack) => {
    setQueue(prev => {
      if (prev.some(t => t.id === track.id)) {
        return prev;
      }
      return [...prev, track];
    });
    logInfo(`Added track to queue: ${track.title}`, 'useAudioQueue');
  }, []);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue(prev => {
      const newQueue = prev.filter(t => t.id !== trackId);
      if (currentQueueIndex >= newQueue.length) {
        setCurrentQueueIndex(Math.max(0, newQueue.length - 1));
      }
      return newQueue;
    });
    logInfo(`Removed track from queue: ${trackId}`, 'useAudioQueue');
  }, [currentQueueIndex]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentQueueIndex(-1);
    logInfo('Queue cleared', 'useAudioQueue');
  }, []);

  const reorderQueue = useCallback((startIndex: number, endIndex: number) => {
    setQueue(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      if (currentQueueIndex === startIndex) {
        setCurrentQueueIndex(endIndex);
      } else if (startIndex < currentQueueIndex && endIndex >= currentQueueIndex) {
        setCurrentQueueIndex(currentQueueIndex - 1);
      } else if (startIndex > currentQueueIndex && endIndex <= currentQueueIndex) {
        setCurrentQueueIndex(currentQueueIndex + 1);
      }
      
      return result;
    });
    logInfo('Queue reordered', 'useAudioQueue', { startIndex, endIndex });
  }, [currentQueueIndex]);

  const playNext = useCallback((
    playTrack: (track: AudioPlayerTrack) => void
  ) => {
    if (queue.length === 0) {
      logInfo('Queue is empty, cannot play next', 'useAudioQueue');
      return;
    }

    const nextIndex = currentQueueIndex + 1;
    if (nextIndex < queue.length) {
      setCurrentQueueIndex(nextIndex);
      playTrack(queue[nextIndex]);
      logInfo(`Playing next track in queue (${nextIndex + 1}/${queue.length})`, 'useAudioQueue');
    } else {
      logInfo('End of queue reached', 'useAudioQueue');
    }
  }, [queue, currentQueueIndex]);

  const playPrevious = useCallback((
    playTrack: (track: AudioPlayerTrack) => void
  ) => {
    if (queue.length === 0) {
      logInfo('Queue is empty, cannot play previous', 'useAudioQueue');
      return;
    }

    const prevIndex = currentQueueIndex - 1;
    if (prevIndex >= 0) {
      setCurrentQueueIndex(prevIndex);
      playTrack(queue[prevIndex]);
      logInfo(`Playing previous track in queue (${prevIndex + 1}/${queue.length})`, 'useAudioQueue');
    } else {
      logInfo('Beginning of queue reached', 'useAudioQueue');
    }
  }, [queue, currentQueueIndex]);

  // ✅ Preload для следующего трека в очереди
  const preloadNextTrack = useCallback(() => {
    if (queue.length === 0 || currentQueueIndex >= queue.length - 1) return;
    
    const nextTrack = queue[currentQueueIndex + 1];
    if (nextTrack?.audio_url && !preloadedTracksRef.current.has(nextTrack.id)) {
      const preloadAudio = new Audio();
      preloadAudio.preload = 'auto';
      preloadAudio.src = nextTrack.audio_url;
      preloadedTracksRef.current.add(nextTrack.id);
      
      logInfo('Preloading next track', 'useAudioQueue', { 
        trackId: nextTrack.id,
        title: nextTrack.title 
      });
    }
  }, [queue, currentQueueIndex]);

  // Вызывать при смене трека
  useEffect(() => {
    preloadNextTrack();
  }, [currentQueueIndex, preloadNextTrack]);

  return {
    queue,
    currentQueueIndex,
    setQueue,
    setCurrentQueueIndex,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    playNext,
    playPrevious,
  };
};
