/**
 * useTrackState Hook
 *
 * Shared state management hook for track components (TrackCard, TrackRow)
 * Handles:
 * - Version management and selection
 * - Like functionality for active version
 * - Audio player synchronization
 * - Download and sharing
 * - Public/private toggle
 *
 * @version 1.0.0
 * @created 2025-11-07
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentTrack, useIsPlaying, useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useTrackVersions } from '@/features/tracks/hooks';
import { useTrackVersionLike } from '@/features/tracks/hooks/useTrackVersionLike';
import { useToast } from '@/hooks/use-toast';
import type { Track } from '@/types/domain/track.types';
import { logger } from '@/utils/logger';

export interface UseTrackStateOptions {
  /**
   * Whether to load versions immediately
   * Set to false if you want to defer version loading for performance
   */
  loadVersions?: boolean;
}

export const useTrackState = (track: Track, options: UseTrackStateOptions = {}) => {
  const { loadVersions = true } = options;
  const { toast } = useToast();
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);

  const { versions, mainVersion, versionCount, masterVersion } = useTrackVersions(
    track.id,
    loadVersions
  );

  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasStems, setHasStems] = useState(false);

  // Initialize selectedVersionIndex from localStorage or default to 0
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(() => {
    try {
      const key = `track:selectedVersion:${track.id}`;
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = Number(stored);
        return Number.isNaN(parsed) ? 0 : parsed;
      }
    } catch {
      // Silently ignore localStorage read errors
    }
    return 0;
  });

  // Check for stems
  useEffect(() => {
    const checkStems = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase
          .from('track_stems')
          .select('id')
          .eq('track_id', track.id)
          .limit(1);
        setHasStems((data?.length || 0) > 0);
      } catch (error) {
        logger.error('Failed to check stems', error as Error, 'useTrackState', {
          trackId: track.id,
        });
      }
    };
    checkStems();
  }, [track.id]);

  // Filter only versions with audio_url
  const allVersions = useMemo(() => {
    if (!mainVersion) return [];
    const validVersions = [mainVersion, ...versions].filter((v) => !!v.audio_url);
    return validVersions;
  }, [mainVersion, versions]);

  // Sync with audio player
  useEffect(() => {
    if (!currentTrack || !allVersions.length) {
      // If track is not active, return to master version
      const masterIndex = allVersions.findIndex((v) => v.isMasterVersion);
      if (masterIndex !== -1 && masterIndex !== selectedVersionIndex) {
        setSelectedVersionIndex(masterIndex);
      }
      return;
    }

    const isCurrentTrack =
      currentTrack.parentTrackId === track.id || currentTrack.id === track.id;
    if (!isCurrentTrack) {
      // If track is not active, return to master version
      const masterIndex = allVersions.findIndex((v) => v.isMasterVersion);
      if (masterIndex !== -1 && masterIndex !== selectedVersionIndex) {
        setSelectedVersionIndex(masterIndex);
      }
      return;
    }

    // If track is active, sync with player
    const currentVersionInAllVersions = allVersions.findIndex(
      (v) => v.id === currentTrack.id
    );

    if (
      currentVersionInAllVersions !== -1 &&
      currentVersionInAllVersions !== selectedVersionIndex
    ) {
      setSelectedVersionIndex(currentVersionInAllVersions);
    }
  }, [currentTrack, track.id, allVersions, selectedVersionIndex]);

  // Validate and update selectedVersionIndex when allVersions changes
  useEffect(() => {
    if (selectedVersionIndex >= allVersions.length) {
      setSelectedVersionIndex(0); // Reset to 0 if out of bounds
    }
  }, [allVersions, selectedVersionIndex]);

  // Save selectedVersionIndex to localStorage
  useEffect(() => {
    try {
      const key = `track:selectedVersion:${track.id}`;
      localStorage.setItem(key, String(selectedVersionIndex));
    } catch {
      // Silently ignore localStorage write errors
    }
  }, [track.id, selectedVersionIndex]);

  // Displayed version
  const displayedVersion = useMemo(() => {
    const version = allVersions[selectedVersionIndex];
    return (
      version ||
      mainVersion || {
        id: track.id,
        title: track.title,
        audio_url: track.audio_url,
        cover_url: track.cover_url,
        duration: track.duration,
        versionNumber: 1,
        isMasterVersion: false,
        parentTrackId: track.id,
        lyrics: null,
      }
    );
  }, [allVersions, selectedVersionIndex, mainVersion, track]);

  // Check if displayedVersion is a real version from track_versions table
  const isRealVersion = useMemo(() => {
    return allVersions.some(v => v.id === displayedVersion.id);
  }, [allVersions, displayedVersion.id]);

  // ✅ SIMPLIFIED: Use ONLY version likes system
  // Tracks without versions in track_versions will have disabled like functionality
  const { isLiked, likeCount, toggleLike } = useTrackVersionLike(
    isRealVersion ? displayedVersion.id : null,
    displayedVersion.like_count ?? 0
  );

  // Context menu target is the displayed version
  const operationTargetId = useMemo(() => {
    return displayedVersion.id;
  }, [displayedVersion.id]);

  const operationTargetVersion = useMemo(() => {
    return displayedVersion;
  }, [displayedVersion]);

  const isCurrentTrack = currentTrack?.id === displayedVersion.id;
  const playButtonDisabled = track.status !== 'completed' || !displayedVersion.audio_url;

  // UI version count (number of additional versions, excluding main)
  const uiVersionCount = useMemo(() => {
    return versionCount;
  }, [versionCount]);

  const handleVersionChange = useCallback(
    (versionIndex: number) => {
      // ✅ FIX: Don't filter - use allVersions directly to maintain index consistency
      if (versionIndex < 0 || versionIndex >= allVersions.length) {
        logger.error(
          'Version change failed - index out of bounds',
          new Error('Invalid version index'),
          'useTrackState',
          { trackId: track.id, versionIndex, maxIndex: allVersions.length - 1 }
        );
        return;
      }

      const newVersion = allVersions[versionIndex];

      if (!newVersion) {
        logger.error(
          'Version change failed - no version at index',
          new Error('Missing version'),
          'useTrackState',
          { trackId: track.id, versionIndex }
        );
        return;
      }

      if (!newVersion.audio_url) {
        logger.warn(
          'Version change skipped - no audio URL',
          'useTrackState',
          { trackId: track.id, versionId: newVersion.id, versionIndex }
        );
        return;
      }

      // Update UI state with the exact index from allVersions
      setSelectedVersionIndex(versionIndex);

      // Switch audio if this track is currently active in the player
      const isThisTrackActive =
        currentTrack?.id === track.id ||
        currentTrack?.parentTrackId === track.id ||
        currentTrack?.id === newVersion.id;

      if (isThisTrackActive && newVersion.audio_url) {
        switchToVersion(newVersion.id);
      }
    },
    [allVersions, currentTrack, track.id, switchToVersion]
  );

  const handlePlayClick = useCallback(
    (event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }
      if (playButtonDisabled) {
        logger.warn('Play clicked but button is disabled', 'useTrackState', {
          trackId: track.id,
          status: track.status,
          hasAudioUrl: !!displayedVersion.audio_url,
        });
        return;
      }

      if (!displayedVersion.audio_url) {
        logger.error(
          'Cannot play track - no audio URL',
          new Error('Missing audio URL'),
          'useTrackState',
          { trackId: track.id, versionId: displayedVersion.id }
        );
        toast({
          title: 'Ошибка',
          description: 'Аудиофайл недоступен',
          variant: 'destructive',
        });
        return;
      }

      const audioTrack = {
        id: displayedVersion.id,
        title: displayedVersion.title || track.title,
        audio_url: displayedVersion.audio_url,
        cover_url: displayedVersion.cover_url || track.cover_url || undefined,
        duration: displayedVersion.duration || track.duration || undefined,
        status: 'completed' as const,
        style_tags: track.style_tags || [],
        lyrics: displayedVersion.lyrics || undefined,
        parentTrackId: track.id,
        versionNumber: displayedVersion.versionNumber,
        isMasterVersion: displayedVersion.isMasterVersion,
      };

      try {
        playTrack(audioTrack);
      } catch (error) {
        logger.error('Failed to play track', error as Error, 'useTrackState', {
          trackId: track.id,
          versionId: displayedVersion.id,
        });
        toast({
          title: 'Ошибка',
          description: 'Не удалось начать воспроизведение',
          variant: 'destructive',
        });
      }
    },
    [playButtonDisabled, displayedVersion, track, playTrack, toast]
  );

  const handleLikeClick = useCallback(() => {
    toggleLike();
  }, [toggleLike]);

  const handleDownloadClick = useCallback(() => {
    if (!displayedVersion.audio_url) {
      toast({
        title: 'Ошибка',
        description: 'Аудиофайл недоступен',
        variant: 'destructive',
      });
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = displayedVersion.audio_url;
      link.download = `${displayedVersion.title || track.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: 'Скачивание начато',
        description: `${displayedVersion.title || track.title}`,
      });
    } catch (error) {
      logger.error('Failed to download track', error as Error, 'useTrackState', {
        trackId: track.id,
        versionId: displayedVersion.id,
      });
      toast({
        title: 'Ошибка',
        description: 'Не удалось скачать файл',
        variant: 'destructive',
      });
    }
  }, [displayedVersion, track.title, toast, track.id]);

  const handleTogglePublic = useCallback(async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('tracks')
        .update({ is_public: !track.is_public })
        .eq('id', track.id);
      if (error) throw error;
      toast({
        title: track.is_public ? 'Трек скрыт' : 'Трек опубликован',
        description: track.is_public
          ? 'Трек теперь виден только вам'
          : 'Трек теперь доступен всем пользователям',
      });
    } catch (error) {
      logger.error('Failed to toggle track public status', error as Error, 'useTrackState', {
        trackId: track.id,
      });
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус публикации',
        variant: 'destructive',
      });
    }
  }, [track.id, track.is_public, toast]);

  const handleShareClick = useCallback(() => {
    const shareUrl = `${window.location.origin}/track/${displayedVersion.id}`;

    if (navigator.share) {
      navigator
        .share({
          title: displayedVersion.title || track.title,
          text: `Check out this track: ${displayedVersion.title || track.title}`,
          url: shareUrl,
        })
        .catch((error) => {
          logger.error('Failed to share track', error as Error, 'useTrackState', {
            trackId: track.id,
            versionId: displayedVersion.id,
          });
        });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(
        () => {
          toast({
            title: 'Ссылка скопирована',
            description: 'Ссылка на трек скопирована в буфер обмена',
          });
        },
        (error) => {
          logger.error('Failed to copy share link', error as Error, 'useTrackState', {
            trackId: track.id,
            versionId: displayedVersion.id,
          });
          toast({
            title: 'Ошибка',
            description: 'Не удалось скопировать ссылку',
            variant: 'destructive',
          });
        }
      );
    }
  }, [displayedVersion, track.title, track.id, toast]);

  return {
    // State
    isHovered,
    setIsHovered,
    isVisible,
    setIsVisible,
    hasStems,
    selectedVersionIndex,
    isLiked,
    likeCount,
    versionCount: uiVersionCount,
    masterVersion,
    displayedVersion,
    operationTargetId,
    operationTargetVersion,
    isCurrentTrack,
    isPlaying,
    playButtonDisabled,
    allVersions,

    // Handlers
    handleVersionChange,
    handlePlayClick,
    handleLikeClick,
    handleDownloadClick,
    handleTogglePublic,
    handleShareClick,
  };
};
