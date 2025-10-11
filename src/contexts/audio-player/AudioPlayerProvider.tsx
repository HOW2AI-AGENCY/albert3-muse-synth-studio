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

  // Wrapper для playTrack с загрузкой версий и автоматической очередью
  const playTrack = useCallback(async (track: AudioPlayerTrack) => {
    // Загружаем версии трека
    const baseTrackId = track.parentTrackId || track.id;
    const versionsList = await versions.loadVersions(baseTrackId, false);
    
    // Формируем очередь из всех версий
    if (versionsList.length > 0) {
      const allVersionsQueue: AudioPlayerTrack[] = versionsList
        .filter(v => v.audio_url)
        .map(v => ({
          id: v.id,
          title: v.title,
          audio_url: v.audio_url!,
          cover_url: v.cover_url,
          duration: v.duration,
          style_tags: v.style_tags,
          lyrics: v.lyrics,
          status: 'completed' as const,
          parentTrackId: v.parentTrackId,
          versionNumber: v.versionNumber,
          isMasterVersion: v.isMasterVersion,
          isOriginalVersion: v.versionNumber === 0 || v.isOriginal === true,
        }));
      
      // Устанавливаем очередь из всех версий
      queue.setQueue(allVersionsQueue);
      
      // Находим текущий трек в очереди
      const currentIdx = allVersionsQueue.findIndex(v => v.id === track.id);
      queue.setCurrentQueueIndex(currentIdx >= 0 ? currentIdx : 0);
      versions.setCurrentVersionIndex(currentIdx >= 0 ? currentIdx : 0);
    }
    
    // Воспроизводим трек
    playback.playTrack(track, async (baseId: string, wasEmpty: boolean) => {
      await versions.loadVersions(baseId, wasEmpty);
    });
  }, [playback, versions, queue]);

  // Воспроизведение трека с кастомной очередью (все треки страницы)
  const playTrackWithQueue = useCallback((track: AudioPlayerTrack, allTracks: AudioPlayerTrack[]) => {
    queue.setQueue(allTracks);
    const trackIndex = allTracks.findIndex(t => t.id === track.id);
    queue.setCurrentQueueIndex(trackIndex >= 0 ? trackIndex : 0);
    
    // Воспроизводим без автоматической очереди версий
    playback.playTrack(track);
  }, [queue, playback]);

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
