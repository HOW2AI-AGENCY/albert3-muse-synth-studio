/**
 * Hook для управления версиями треков в аудиоплеере
 * Phase 3 Optimization: Centralized cache + Preloading
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioPlayerTrack } from '@/types/track';
import { TrackWithVersions } from '@/features/tracks';
import { logInfo, logError } from '@/utils/logger';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchTrackVersions, 
  invalidateTrackVersionsCache,
  subscribeToTrackVersions 
} from '@/features/tracks/hooks/useTrackVersions';
import { cacheAudioFile } from '@/utils/serviceWorker';

// Export helper for use in other modules
export { invalidateTrackVersionsCache };

export const useAudioVersions = () => {
  const [availableVersions, setAvailableVersions] = useState<TrackWithVersions[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const { toast } = useToast();
  const preloadedTracksRef = useRef<Set<string>>(new Set());

  /**
   * Загрузка всех версий для трека
   * Phase 3: Uses centralized cache from useTrackVersions
   */
  const loadVersions = useCallback(async (trackId: string, force = false): Promise<TrackWithVersions[]> => {
    try {
      logInfo(`Loading versions for track: ${trackId}${force ? ' (forced)' : ''}`, 'useAudioVersions');
      
      // Phase 3: Use centralized cache-aware fetch
      const versions = await fetchTrackVersions(trackId, { force });
      
      if (versions.length > 0) {
        setAvailableVersions(versions);
        logInfo(`Loaded ${versions.length} versions for track ${trackId} (from cache: ${!force})`, 'useAudioVersions');
      }
      
      return versions;
    } catch (error) {
      logError('Failed to load track versions', error as Error, 'useAudioVersions', { trackId });
      return [];
    }
  }, []);

  /**
   * Preload audio for next version (instant switching)
   * Phase 3: Background preloading optimization
   */
  const preloadNextVersion = useCallback(async () => {
    if (availableVersions.length === 0 || currentVersionIndex < 0) return;

    const nextIndex = (currentVersionIndex + 1) % availableVersions.length;
    const nextVersion = availableVersions[nextIndex];

    if (!nextVersion?.audio_url) return;
    if (preloadedTracksRef.current.has(nextVersion.audio_url)) {
      logInfo('Next version already preloaded', 'useAudioVersions', { versionId: nextVersion.id });
      return;
    }

    try {
      await cacheAudioFile(nextVersion.audio_url);
      preloadedTracksRef.current.add(nextVersion.audio_url);
      logInfo('Preloaded next version', 'useAudioVersions', { 
        versionId: nextVersion.id, 
        versionNumber: nextVersion.versionNumber 
      });
    } catch (error) {
      logError('Failed to preload next version', error as Error, 'useAudioVersions', { versionId: nextVersion.id });
    }
  }, [availableVersions, currentVersionIndex]);

  /**
   * Subscribe to cache updates from useTrackVersions
   * Phase 3: Real-time cache synchronization
   */
  useEffect(() => {
    if (availableVersions.length === 0) return;

    const baseTrackId = availableVersions[0]?.parentTrackId || availableVersions[0]?.id;
    if (!baseTrackId) return;

    const unsubscribe = subscribeToTrackVersions(baseTrackId, (updatedVersions: TrackWithVersions[]) => {
      if (updatedVersions.length > 0 && updatedVersions !== availableVersions) {
        setAvailableVersions(updatedVersions);
        logInfo('Versions updated from cache subscription', 'useAudioVersions', { 
          trackId: baseTrackId,
          count: updatedVersions.length 
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [availableVersions]);

  /**
   * Auto-preload next version when current changes
   * Phase 3: Proactive preloading
   */
  useEffect(() => {
    if (availableVersions.length > 1) {
      preloadNextVersion();
    }
  }, [currentVersionIndex, preloadNextVersion, availableVersions.length]);

  /**
   * Получение списка доступных версий текущего трека
   */
  const getAvailableVersions = useCallback((): AudioPlayerTrack[] => {
    if (availableVersions.length === 0) return [];
    
    return availableVersions
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
      }));
  }, [availableVersions]);

  /**
   * Переключение на конкретную версию трека
   */
  const switchToVersion = useCallback(async (
    versionId: string,
    currentTrack: AudioPlayerTrack | null,
    playTrack: (track: AudioPlayerTrack) => void
  ) => {
    let version = availableVersions.find(v => v.id === versionId);
    
    if (!version && currentTrack) {
      logInfo('Version not found, force reloading', 'useAudioVersions', { versionId });
      const baseTrackId = currentTrack.parentTrackId || currentTrack.id;
      const reloadedVersions = await loadVersions(baseTrackId, true);
      version = reloadedVersions.find(v => v.id === versionId);
    }
    
    if (!version) {
      logError('Version not found after reload', new Error(`Version ${versionId} not found`), 'useAudioVersions', { 
        versionId, 
        availableCount: availableVersions.length 
      });
      toast({
        title: "Версия не найдена",
        description: "Попробуйте обновить список треков",
        variant: "destructive",
      });
      return;
    }
    
    if (!version.audio_url) {
      logError('Version has no audio URL', new Error(`Version ${versionId} has no audio_url`), 'useAudioVersions', { versionId });
      toast({
        title: "Версия недоступна",
        description: "Аудио не найдено для этой версии",
        variant: "destructive",
      });
      return;
    }
    
    const versionIndex = availableVersions.findIndex(v => v.id === versionId);
    setCurrentVersionIndex(versionIndex);
    
    logInfo(`Switching to version ${versionIndex + 1}/${availableVersions.length}`, 'useAudioVersions', { 
      versionId, 
      versionNumber: version.versionNumber,
      isMaster: version.isMasterVersion 
    });
    
    const trackToPlay: AudioPlayerTrack = {
      id: version.id,
      title: version.title,
      audio_url: version.audio_url,
      cover_url: version.cover_url,
      duration: version.duration,
      style_tags: version.style_tags,
      lyrics: version.lyrics,
      status: 'completed',
      parentTrackId: version.parentTrackId,
      versionNumber: version.versionNumber,
      isMasterVersion: version.isMasterVersion,
    };
    
    playTrack(trackToPlay);
  }, [availableVersions, loadVersions, toast]);

  return {
    availableVersions,
    currentVersionIndex,
    setCurrentVersionIndex,
    loadVersions,
    getAvailableVersions,
    switchToVersion,
    preloadNextVersion, // Phase 3: Expose preloading for manual control
  };
};
