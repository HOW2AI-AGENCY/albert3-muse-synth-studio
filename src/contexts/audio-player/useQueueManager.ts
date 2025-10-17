/**
 * Phase 2: Unified Queue Manager
 * 
 * Управляет двумя раздельными очередями:
 * 1. Main Queue - основные треки (добавленные пользователем через playTrackWithQueue)
 * 2. Versions Queue - версии текущего трека (автоматически при playTrack)
 * 
 * Режимы воспроизведения:
 * - 'main': переключение между основными треками (Next/Previous по Main Queue)
 * - 'versions': переключение между версиями (Next/Previous по Versions Queue)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioPlayerTrack } from '@/types/track';
import { logInfo } from '@/utils/logger';

export type PlaybackMode = 'main' | 'versions';

export const useQueueManager = () => {
  // Main Queue - основные треки
  const [mainQueue, setMainQueue] = useState<AudioPlayerTrack[]>([]);
  const [currentMainIndex, setCurrentMainIndex] = useState(-1);

  // Versions Queue - версии текущего трека
  const [versionsQueue, setVersionsQueue] = useState<AudioPlayerTrack[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

  // Режим воспроизведения
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('versions');

  const preloadedTracksRef = useRef<Set<string>>(new Set());

  /**
   * Установить основную очередь треков (из библиотеки/плейлиста)
   */
  const setMainQueueTracks = useCallback((tracks: AudioPlayerTrack[], currentTrackId?: string) => {
    setMainQueue(tracks);
    
    if (currentTrackId) {
      const index = tracks.findIndex(t => t.id === currentTrackId);
      setCurrentMainIndex(index >= 0 ? index : 0);
    }
    
    setPlaybackMode('main');
    logInfo('Main queue set', 'useQueueManager', { 
      trackCount: tracks.length,
      currentTrackId,
      mode: 'main'
    });
  }, []);

  /**
   * Установить очередь версий для текущего трека
   */
  const setVersionsTracks = useCallback((versions: AudioPlayerTrack[], currentVersionId?: string) => {
    setVersionsQueue(versions);
    
    if (currentVersionId) {
      const index = versions.findIndex(v => v.id === currentVersionId);
      setCurrentVersionIndex(index >= 0 ? index : 0);
    }
    
    setPlaybackMode('versions');
    logInfo('Versions queue set', 'useQueueManager', { 
      versionCount: versions.length,
      currentVersionId,
      mode: 'versions'
    });
  }, []);

  /**
   * Добавить трек в основную очередь
   */
  const addToMainQueue = useCallback((track: AudioPlayerTrack) => {
    setMainQueue(prev => {
      if (prev.some(t => t.id === track.id)) {
        logInfo('Track already in main queue', 'useQueueManager', { trackId: track.id });
        return prev;
      }
      const updated = [...prev, track];
      logInfo('Added track to main queue', 'useQueueManager', { 
        trackId: track.id,
        queueLength: updated.length 
      });
      return updated;
    });
  }, []);

  /**
   * Удалить трек из основной очереди
   */
  const removeFromMainQueue = useCallback((trackId: string) => {
    setMainQueue(prev => {
      const newQueue = prev.filter(t => t.id !== trackId);
      
      // Корректировка индекса
      if (currentMainIndex >= newQueue.length) {
        setCurrentMainIndex(Math.max(0, newQueue.length - 1));
      }
      
      logInfo('Removed track from main queue', 'useQueueManager', { 
        trackId,
        newQueueLength: newQueue.length 
      });
      return newQueue;
    });
  }, [currentMainIndex]);

  /**
   * Очистить основную очередь
   */
  const clearMainQueue = useCallback(() => {
    setMainQueue([]);
    setCurrentMainIndex(-1);
    logInfo('Main queue cleared', 'useQueueManager');
  }, []);

  /**
   * Очистить очередь версий
   */
  const clearVersionsQueue = useCallback(() => {
    setVersionsQueue([]);
    setCurrentVersionIndex(-1);
    logInfo('Versions queue cleared', 'useQueueManager');
  }, []);

  /**
   * Переход к следующему треку (учитывает режим воспроизведения)
   */
  const playNext = useCallback((
    playTrack: (track: AudioPlayerTrack) => void
  ) => {
    if (playbackMode === 'versions') {
      // Режим версий - переключаем между версиями текущего трека
      if (versionsQueue.length === 0) {
        logInfo('Versions queue is empty', 'useQueueManager');
        return;
      }

      const nextIndex = currentVersionIndex + 1;
      if (nextIndex < versionsQueue.length) {
        setCurrentVersionIndex(nextIndex);
        playTrack(versionsQueue[nextIndex]);
        logInfo(`Playing next version (${nextIndex + 1}/${versionsQueue.length})`, 'useQueueManager');
      } else {
        // Дошли до конца версий - переключаемся на следующий основной трек
        if (mainQueue.length > 0 && currentMainIndex < mainQueue.length - 1) {
          const nextMainIndex = currentMainIndex + 1;
          setCurrentMainIndex(nextMainIndex);
          setPlaybackMode('main');
          playTrack(mainQueue[nextMainIndex]);
          logInfo('End of versions, switching to next main track', 'useQueueManager');
        } else {
          logInfo('End of all queues', 'useQueueManager');
        }
      }
    } else {
      // Режим основных треков
      if (mainQueue.length === 0) {
        logInfo('Main queue is empty', 'useQueueManager');
        return;
      }

      const nextIndex = currentMainIndex + 1;
      if (nextIndex < mainQueue.length) {
        setCurrentMainIndex(nextIndex);
        playTrack(mainQueue[nextIndex]);
        logInfo(`Playing next main track (${nextIndex + 1}/${mainQueue.length})`, 'useQueueManager');
      } else {
        logInfo('End of main queue', 'useQueueManager');
      }
    }
  }, [playbackMode, versionsQueue, currentVersionIndex, mainQueue, currentMainIndex]);

  /**
   * Переход к предыдущему треку (учитывает режим воспроизведения)
   */
  const playPrevious = useCallback((
    playTrack: (track: AudioPlayerTrack) => void
  ) => {
    if (playbackMode === 'versions') {
      // Режим версий
      if (versionsQueue.length === 0) {
        logInfo('Versions queue is empty', 'useQueueManager');
        return;
      }

      const prevIndex = currentVersionIndex - 1;
      if (prevIndex >= 0) {
        setCurrentVersionIndex(prevIndex);
        playTrack(versionsQueue[prevIndex]);
        logInfo(`Playing previous version (${prevIndex + 1}/${versionsQueue.length})`, 'useQueueManager');
      } else {
        // Дошли до начала версий - переключаемся на предыдущий основной трек
        if (mainQueue.length > 0 && currentMainIndex > 0) {
          const prevMainIndex = currentMainIndex - 1;
          setCurrentMainIndex(prevMainIndex);
          setPlaybackMode('main');
          playTrack(mainQueue[prevMainIndex]);
          logInfo('Beginning of versions, switching to previous main track', 'useQueueManager');
        } else {
          logInfo('Beginning of all queues', 'useQueueManager');
        }
      }
    } else {
      // Режим основных треков
      if (mainQueue.length === 0) {
        logInfo('Main queue is empty', 'useQueueManager');
        return;
      }

      const prevIndex = currentMainIndex - 1;
      if (prevIndex >= 0) {
        setCurrentMainIndex(prevIndex);
        playTrack(mainQueue[prevIndex]);
        logInfo(`Playing previous main track (${prevIndex + 1}/${mainQueue.length})`, 'useQueueManager');
      } else {
        logInfo('Beginning of main queue', 'useQueueManager');
      }
    }
  }, [playbackMode, versionsQueue, currentVersionIndex, mainQueue, currentMainIndex]);

  /**
   * Переупорядочить основную очередь (drag-and-drop)
   */
  const reorderMainQueue = useCallback((startIndex: number, endIndex: number) => {
    setMainQueue(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Корректировка текущего индекса
      if (currentMainIndex === startIndex) {
        setCurrentMainIndex(endIndex);
      } else if (startIndex < currentMainIndex && endIndex >= currentMainIndex) {
        setCurrentMainIndex(currentMainIndex - 1);
      } else if (startIndex > currentMainIndex && endIndex <= currentMainIndex) {
        setCurrentMainIndex(currentMainIndex + 1);
      }
      
      return result;
    });
    logInfo('Main queue reordered', 'useQueueManager', { startIndex, endIndex });
  }, [currentMainIndex]);

  /**
   * Preload следующего трека
   */
  const preloadNextTrack = useCallback(() => {
    let nextTrack: AudioPlayerTrack | null = null;

    if (playbackMode === 'versions') {
      if (currentVersionIndex < versionsQueue.length - 1) {
        nextTrack = versionsQueue[currentVersionIndex + 1];
      } else if (currentMainIndex < mainQueue.length - 1) {
        nextTrack = mainQueue[currentMainIndex + 1];
      }
    } else {
      if (currentMainIndex < mainQueue.length - 1) {
        nextTrack = mainQueue[currentMainIndex + 1];
      }
    }

    if (nextTrack?.audio_url && !preloadedTracksRef.current.has(nextTrack.id)) {
      const preloadAudio = new Audio();
      preloadAudio.preload = 'auto';
      preloadAudio.src = nextTrack.audio_url;
      preloadedTracksRef.current.add(nextTrack.id);
      
      logInfo('Preloading next track', 'useQueueManager', { 
        trackId: nextTrack.id,
        title: nextTrack.title 
      });
    }
  }, [playbackMode, versionsQueue, currentVersionIndex, mainQueue, currentMainIndex]);

  // Auto-preload при смене индекса
  useEffect(() => {
    preloadNextTrack();
  }, [currentVersionIndex, currentMainIndex, playbackMode, preloadNextTrack]);

  return {
    // Main Queue
    mainQueue,
    currentMainIndex,
    setMainQueueTracks,
    addToMainQueue,
    removeFromMainQueue,
    clearMainQueue,
    reorderMainQueue,

    // Versions Queue
    versionsQueue,
    currentVersionIndex,
    setVersionsTracks,
    clearVersionsQueue,

    // Navigation
    playbackMode,
    setPlaybackMode,
    playNext,
    playPrevious,
  };
};
