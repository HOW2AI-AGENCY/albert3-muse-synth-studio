/**
 * Главный провайдер Audio Player Context
 * Композиция всех sub-hooks для управления воспроизведением
 */
import { createContext, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { usePlayAnalytics } from '@/hooks/usePlayAnalytics';
import { AudioPlayerTrack } from '@/types/track';
import { AudioPlayerContextType } from './types';
import { useAudioPlayback } from './useAudioPlayback';
import { useAudioQueue } from './useAudioQueue';
import { useAudioVersions } from './useAudioVersions';

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  // Композиция hooks
  const playback = useAudioPlayback();
  const queue = useAudioQueue();
  const versions = useAudioVersions();

  // Analytics
  usePlayAnalytics(playback.currentTrack?.id || null, playback.isPlaying, playback.currentTime);

  // Wrapper для playTrack с загрузкой версий
  const playTrack = useCallback((track: AudioPlayerTrack) => {
    playback.playTrack(track, async (baseTrackId: string, wasEmpty: boolean) => {
      await versions.loadVersions(baseTrackId, wasEmpty);
      
      const versionsList = await versions.loadVersions(baseTrackId, wasEmpty);
      if (versionsList.length > 0) {
        const currentIdx = versionsList.findIndex(v => v.id === track.id);
        versions.setCurrentVersionIndex(currentIdx >= 0 ? currentIdx : 0);
      }
    });
  }, [playback, versions]);

  // Воспроизведение трека с очередью
  const playTrackWithQueue = useCallback((track: AudioPlayerTrack, allTracks: AudioPlayerTrack[]) => {
    queue.setQueue(allTracks);
    const trackIndex = allTracks.findIndex(t => t.id === track.id);
    queue.setCurrentQueueIndex(trackIndex >= 0 ? trackIndex : 0);
    playTrack(track);
  }, [queue, playTrack]);

  // Обертки для queue методов
  const playNext = useCallback(() => {
    queue.playNext(playTrack);
  }, [queue, playTrack]);

  const playPrevious = useCallback(() => {
    queue.playPrevious(playTrack);
  }, [queue, playTrack]);

  // Wrapper для switchToVersion
  const switchToVersion = useCallback((versionId: string) => {
    versions.switchToVersion(versionId, playback.currentTrack, playTrack);
  }, [versions, playback.currentTrack, playTrack]);

  // Обработка окончания трека - автопереход к следующему
  useEffect(() => {
    const audio = playback.audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      playback.pauseTrack(); // Останавливаем текущий
      playNext(); // Переходим к следующему в очереди
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [playback, playNext]);

  const contextValue = useMemo<AudioPlayerContextType>(() => ({
    // Playback state
    currentTrack: playback.currentTrack,
    isPlaying: playback.isPlaying,
    currentTime: playback.currentTime,
    duration: playback.duration,
    volume: playback.volume,
    audioRef: playback.audioRef,

    // Queue state
    queue: queue.queue,
    currentQueueIndex: queue.currentQueueIndex,

    // Versions state
    currentVersionIndex: versions.currentVersionIndex,

    // Playback methods
    playTrack,
    playTrackWithQueue,
    togglePlayPause: playback.togglePlayPause,
    pauseTrack: playback.pauseTrack,
    seekTo: playback.seekTo,
    setVolume: playback.setVolume,
    clearCurrentTrack: playback.clearCurrentTrack,

    // Queue methods
    playNext,
    playPrevious,
    addToQueue: queue.addToQueue,
    removeFromQueue: queue.removeFromQueue,
    clearQueue: queue.clearQueue,
    reorderQueue: queue.reorderQueue,

    // Versions methods
    switchToVersion,
    getAvailableVersions: versions.getAvailableVersions,

    // Visibility
    isPlayerVisible: !!playback.currentTrack,
  }), [
    playback,
    queue,
    versions,
    playTrack,
    playTrackWithQueue,
    playNext,
    playPrevious,
    switchToVersion,
  ]);

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      <audio ref={playback.audioRef} />
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

export const useAudioPlayerSafe = () => {
  return useContext(AudioPlayerContext);
};
