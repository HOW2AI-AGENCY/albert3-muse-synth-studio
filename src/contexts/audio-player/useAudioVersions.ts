/**
 * Hook для управления версиями треков в аудиоплеере
 */
import { useState, useCallback } from 'react';
import { AudioPlayerTrack } from '@/types/track';
import { getTrackWithVersions, TrackWithVersions } from '@/features/tracks';
import { logInfo, logError } from '@/utils/logger';
import { useToast } from '@/hooks/use-toast';

export const useAudioVersions = () => {
  const [availableVersions, setAvailableVersions] = useState<TrackWithVersions[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const { toast } = useToast();

  /**
   * Загрузка всех версий для трека
   */
  const loadVersions = useCallback(async (trackId: string, force = false): Promise<TrackWithVersions[]> => {
    try {
      logInfo(`Loading versions for track: ${trackId}${force ? ' (forced)' : ''}`, 'useAudioVersions');
      
      if (force) {
        const { invalidateTrackVersionsCache } = await import('@/features/tracks/hooks/useTrackVersions');
        invalidateTrackVersionsCache(trackId);
      }
      
      const versions = await getTrackWithVersions(trackId);
      
      if (versions.length > 0) {
        setAvailableVersions(versions);
        logInfo(`Loaded ${versions.length} versions for track ${trackId}`, 'useAudioVersions');
      }
      
      return versions;
    } catch (error) {
      logError('Failed to load track versions', error as Error, 'useAudioVersions', { trackId });
      return [];
    }
  }, []);

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
  };
};
