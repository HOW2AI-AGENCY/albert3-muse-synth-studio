import { useCallback } from 'react';
import { useAudioPlayerStore, useCurrentTrack } from '@/stores/audioPlayerStore';
import { logInfo } from '@/utils/logger';

/**
 * Hook for navigating between track versions using Previous/Next buttons
 * If track has versions, buttons switch versions instead of tracks
 */
export const useVersionNavigation = () => {
  const currentTrack = useCurrentTrack();
  const availableVersions = useAudioPlayerStore((state) => state.availableVersions);
  const currentVersionIndex = useAudioPlayerStore((state) => state.currentVersionIndex);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const playPrevious = useAudioPlayerStore((state) => state.playPrevious);
  
  const hasVersions = availableVersions.length > 1;

  const switchToNextVersion = useCallback(() => {
    if (!currentTrack || !hasVersions) return false;
    
    const nextIndex = (currentVersionIndex + 1) % availableVersions.length;
    const nextVersion = availableVersions[nextIndex];
    
    if (nextVersion) {
      logInfo('Switching to next version via navigation', 'useVersionNavigation', {
        fromIndex: currentVersionIndex,
        toIndex: nextIndex,
        versionId: nextVersion.id,
      });
      switchToVersion(nextVersion.id);
      return true;
    }
    
    return false;
  }, [currentTrack, hasVersions, currentVersionIndex, availableVersions, switchToVersion]);

  const switchToPreviousVersion = useCallback(() => {
    if (!currentTrack || !hasVersions) return false;
    
    const prevIndex = currentVersionIndex - 1 < 0 
      ? availableVersions.length - 1 
      : currentVersionIndex - 1;
    const prevVersion = availableVersions[prevIndex];
    
    if (prevVersion) {
      logInfo('Switching to previous version via navigation', 'useVersionNavigation', {
        fromIndex: currentVersionIndex,
        toIndex: prevIndex,
        versionId: prevVersion.id,
      });
      switchToVersion(prevVersion.id);
      return true;
    }
    
    return false;
  }, [currentTrack, hasVersions, currentVersionIndex, availableVersions, switchToVersion]);

  const handleNext = useCallback(() => {
    // ✅ Если есть версии, переключаем версию
    if (hasVersions && switchToNextVersion()) {
      return;
    }
    
    // ✅ Иначе, переключаем трек
    playNext();
  }, [hasVersions, switchToNextVersion, playNext]);

  const handlePrevious = useCallback((currentTime: number) => {
    // ✅ Если > 3s, перемотать в начало
    if (currentTime > 3) {
      return 'restart'; // Signal to restart track
    }
    
    // ✅ Если есть версии, переключаем версию
    if (hasVersions && switchToPreviousVersion()) {
      return 'switched';
    }
    
    // ✅ Иначе, переключаем трек
    playPrevious();
    return 'track-switched';
  }, [hasVersions, switchToPreviousVersion, playPrevious]);

  return {
    hasVersions,
    handleNext,
    handlePrevious,
  };
};
