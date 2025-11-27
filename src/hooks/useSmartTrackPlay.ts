/**
 * "Умная" логика воспроизведения треков
 * Phase 2.2 - Автоматический выбор варианта для воспроизведения
 * 
 * Приоритет выбора варианта:
 * 1. Явно указанный предпочитаемый вариант (is_preferred_variant === true)
 * 2. Оригинал (variant_index === 0 или is_original === true)
 * 3. Первый доступный вариант с audio_url
 */

import { useCallback } from 'react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { getTrackWithVersions, TrackWithVersions } from '@/features/tracks';
import { logInfo } from '@/utils/logger';
import type { AudioPlayerTrack } from '@/types/track.types';

export interface SmartPlayOptions {
  /** Форсировать загрузку версий (игнорировать кэш) */
  forceReload?: boolean;
  /** Принудительно воспроизвести конкретную версию */
  specificVersionId?: string;
}

/**
 * Hook для "умного" воспроизведения треков с автоматическим выбором версии
 */
export const useSmartTrackPlay = () => {
  const playTrack = useAudioPlayerStore((state) => state.playTrack);

  /**
   * Выбрать лучший вариант для воспроизведения по приоритету:
   * 1. Явно указанный предпочитаемый вариант (is_preferred_variant === true)
   * 2. Оригинал (variant_index === 0 или is_original === true)
   * 3. Первый доступный вариант
   */
  const selectBestVersion = useCallback((versions: TrackWithVersions[]): TrackWithVersions | null => {
    if (versions.length === 0) return null;

    // 1. Ищем явную мастер-версию
    const masterVersion = versions.find(v => v.isMasterVersion === true);
    if (masterVersion && masterVersion.audio_url) {
      logInfo('Selected master version', 'useSmartTrackPlay', { 
        versionId: masterVersion.id, 
        versionNumber: masterVersion.versionNumber 
      });
      return masterVersion;
    }

    // 2. Ищем первую версию
    const firstVersion = versions[0];
    if (firstVersion && firstVersion.audio_url) {
      logInfo('Selected first version', 'useSmartTrackPlay', { 
        versionId: firstVersion.id 
      });
      return firstVersion;
    }

    // 3. Первая доступная версия с audio_url
    const firstAvailable = versions.find(v => v.audio_url);
    if (firstAvailable) {
      logInfo('Selected first available version', 'useSmartTrackPlay', { 
        versionId: firstAvailable.id,
        versionNumber: firstAvailable.versionNumber
      });
      return firstAvailable;
    }

    return null;
  }, []);

  /**
   * Воспроизвести трек с "умным" выбором версии
   */
  const playTrackSmart = useCallback(async (
    trackId: string,
    options: SmartPlayOptions = {}
  ): Promise<boolean> => {
    try {
      const { specificVersionId } = options;

      // Загружаем версии трека
      const versions = await getTrackWithVersions(trackId);

      if (versions.length === 0) {
        logInfo('No versions found for track', 'useSmartTrackPlay', { trackId });
        return false;
      }

      // Если указана конкретная версия, ищем её
      let selectedVersion: TrackWithVersions | null = null;
      
      if (specificVersionId) {
        selectedVersion = versions.find(v => v.id === specificVersionId) || null;
        if (!selectedVersion) {
          logInfo('Specific version not found, falling back to smart selection', 'useSmartTrackPlay', {
            trackId,
            specificVersionId
          });
        }
      }

      // Если конкретная версия не найдена или не указана, используем умный выбор
      if (!selectedVersion) {
        selectedVersion = selectBestVersion(versions);
      }

      if (!selectedVersion) {
        logInfo('No playable version found', 'useSmartTrackPlay', { trackId });
        return false;
      }

      // Конвертируем в AudioPlayerTrack
      const trackToPlay: AudioPlayerTrack = {
        id: selectedVersion.id,
        title: selectedVersion.title,
        audio_url: selectedVersion.audio_url!,
        cover_url: selectedVersion.cover_url,
        duration: selectedVersion.duration,
        style_tags: selectedVersion.style_tags,
        lyrics: selectedVersion.lyrics,
        status: 'completed',
        parentTrackId: selectedVersion.parentTrackId,
        versionNumber: selectedVersion.versionNumber,
        isMasterVersion: selectedVersion.isMasterVersion,
      };

      // Воспроизводим
      playTrack(trackToPlay);
      
      logInfo('Started smart playback', 'useSmartTrackPlay', {
        trackId,
        selectedVersionId: selectedVersion.id,
        versionNumber: selectedVersion.versionNumber,
        isMaster: selectedVersion.isMasterVersion
      });

      return true;
    } catch (error) {
      logInfo('Smart playback failed', 'useSmartTrackPlay', { trackId, error });
      return false;
    }
  }, [playTrack, selectBestVersion]);

  return {
    playTrackSmart,
    selectBestVersion,
  };
};
