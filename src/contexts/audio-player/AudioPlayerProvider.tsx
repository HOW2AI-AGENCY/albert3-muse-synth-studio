/**
 * Главный провайдер Audio Player Context
 * Композиция всех sub-hooks для управления воспроизведением
 * 
 * Phase 2: Использует новый QueueManager с раздельными очередями
 */
import { createContext, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { usePlayAnalytics } from '@/hooks/usePlayAnalytics';
import { AudioPlayerTrack } from '@/types/track';
import { AudioPlayerContextType } from './types';
import { useAudioPlayback } from './useAudioPlayback';
import { useQueueManager } from './useQueueManager';
import { useAudioVersions } from './useAudioVersions';

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  // Композиция hooks
  const playback = useAudioPlayback();
  const queueManager = useQueueManager();
  const versions = useAudioVersions();

  // Analytics
  usePlayAnalytics(playback.currentTrack?.id || null, playback.isPlaying, playback.currentTime);

  /**
   * Phase 2: playTrack с загрузкой версий и установкой Versions Queue
   * НЕ перезаписывает Main Queue
   */
  const playTrack = useCallback(async (track: AudioPlayerTrack) => {
    const baseTrackId = track.parentTrackId || track.id;
    
    // ✅ Загружаем версии ОДИН РАЗ
    const versionsList = await versions.loadVersions(baseTrackId, false);
    
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
      
      // ✅ Устанавливаем ТОЛЬКО Versions Queue (Main Queue не трогаем!)
      queueManager.setVersionsTracks(allVersionsQueue, track.id);
      versions.setCurrentVersionIndex(
        allVersionsQueue.findIndex(v => v.id === track.id)
      );
    }
    
    // ✅ Воспроизводим БЕЗ повторной загрузки версий
    playback.playTrack(track);
  }, [playback, versions, queueManager]);

  /**
   * Phase 2: playTrackWithQueue устанавливает Main Queue
   * И воспроизводит трек из неё
   */
  const playTrackWithQueue = useCallback((track: AudioPlayerTrack, allTracks: AudioPlayerTrack[]) => {
    // ✅ Устанавливаем Main Queue (список треков библиотеки/плейлиста)
    queueManager.setMainQueueTracks(allTracks, track.id);
    
    // Воспроизводим трек (при этом загрузятся его версии в Versions Queue)
    playTrack(track);
  }, [queueManager, playTrack]);

  // Обертки для queue методов
  const playNext = useCallback(() => {
    queueManager.playNext(playTrack);
  }, [queueManager, playTrack]);

  const playPrevious = useCallback(() => {
    queueManager.playPrevious(playTrack);
  }, [queueManager, playTrack]);

  // ✅ Phase 4: Version Switch Tracking
  const switchToVersion = useCallback((versionId: string) => {
    const currentVersionIndex = versions.currentVersionIndex;
    
    // Track version switch analytics
    import('@/services/analytics.service').then(({ AnalyticsService }) => {
      AnalyticsService.recordEvent({
        eventType: 'track_version_switch',
        trackId: playback.currentTrack?.id,
        metadata: {
          fromVersionIndex: currentVersionIndex,
          toVersionId: versionId,
          availableVersionsCount: versions.getAvailableVersions().length,
        },
      });
    });

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

    // ✅ Phase 2: Queue state теперь использует QueueManager
    queue: queueManager.playbackMode === 'versions' 
      ? queueManager.versionsQueue 
      : queueManager.mainQueue,
    currentQueueIndex: queueManager.playbackMode === 'versions'
      ? queueManager.currentVersionIndex
      : queueManager.currentMainIndex,

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
    addToQueue: queueManager.addToMainQueue,
    removeFromQueue: queueManager.removeFromMainQueue,
    clearQueue: queueManager.clearMainQueue,
    reorderQueue: queueManager.reorderMainQueue,

    // Versions methods
    switchToVersion,
    getAvailableVersions: versions.getAvailableVersions,

    // Visibility
    isPlayerVisible: !!playback.currentTrack,
  }), [
    playback,
    queueManager,
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
