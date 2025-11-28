import { useCallback } from 'react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { logInfo } from '@/utils/logger';

/**
 * Hook for navigating between track versions using Previous/Next buttons
 * If track has versions, buttons switch versions instead of tracks
 * REFATORED to use currentVersionId instead of index.
 */
export const useVersionNavigation = () => {
  // Use a single selector for all required state and actions
  const {
    currentTrack,
    availableVersions,
    currentVersionId,
    switchToVersion,
    playNext,
    playPrevious,
  } = useAudioPlayerStore((state) => ({
    currentTrack: state.currentTrack,
    availableVersions: state.availableVersions,
    currentVersionId: state.currentVersionId,
    switchToVersion: state.switchToVersion,
    playNext: state.playNext,
    playPrevious: state.playPrevious,
  }));
  
  const hasVersions = availableVersions.length > 1;

  const switchToNextVersion = useCallback(() => {
    if (!currentTrack || !hasVersions || !currentVersionId) return false;
    
    const currentIndex = availableVersions.findIndex(v => v.id === currentVersionId);
    if (currentIndex === -1) return false;

    const nextIndex = (currentIndex + 1) % availableVersions.length;
    const nextVersion = availableVersions[nextIndex];
    
    if (nextVersion) {
      logInfo('Switching to next version via navigation', 'useVersionNavigation', {
        fromId: currentVersionId,
        toId: nextVersion.id,
      });
      switchToVersion(nextVersion.id);
      return true;
    }
    
    return false;
  }, [currentTrack, hasVersions, currentVersionId, availableVersions, switchToVersion]);

  const switchToPreviousVersion = useCallback(() => {
    if (!currentTrack || !hasVersions || !currentVersionId) return false;

    const currentIndex = availableVersions.findIndex(v => v.id === currentVersionId);
    if (currentIndex === -1) return false;
    
    const prevIndex = currentIndex - 1 < 0
      ? availableVersions.length - 1 
      : currentIndex - 1;
    const prevVersion = availableVersions[prevIndex];
    
    if (prevVersion) {
      logInfo('Switching to previous version via navigation', 'useVersionNavigation', {
        fromId: currentVersionId,
        toId: prevVersion.id,
      });
      switchToVersion(prevVersion.id);
      return true;
    }
    
    return false;
  }, [currentTrack, hasVersions, currentVersionId, availableVersions, switchToVersion]);

  const handleNext = useCallback(() => {
    if (hasVersions && switchToNextVersion()) {
      return;
    }
    playNext();
  }, [hasVersions, switchToNextVersion, playNext]);

  const handlePrevious = useCallback((currentTime: number) => {
    if (currentTime > 3) {
      return 'restart'; // Signal to restart track
    }
    
    if (hasVersions && switchToPreviousVersion()) {
      return 'switched';
    }
    
    playPrevious();
    return 'track-switched';
  }, [hasVersions, switchToPreviousVersion, playPrevious]);

  return {
    hasVersions,
    handleNext,
    handlePrevious,
  };
};
