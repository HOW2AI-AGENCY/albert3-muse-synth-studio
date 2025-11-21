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
import { useTrackVariants } from '@/features/tracks/hooks';
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

  const { data: variantsData } = useTrackVariants(track.id, loadVersions);

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

  const allVersions = useMemo(() => {
    if (!variantsData) return [];
    const { mainTrack, variants } = variantsData;
    const mainAsVersion = {
      id: mainTrack.id,
      title: mainTrack.title,
      audio_url: mainTrack.audioUrl,
      cover_url: mainTrack.coverUrl,
      duration: mainTrack.duration,
      lyrics: mainTrack.lyrics,
      isMasterVersion: !variantsData.preferredVariant,
      parentTrackId: mainTrack.id,
      versionNumber: 1,
      like_count: 0, // Placeholder
    };
    const variantsAsVersions = variants.map((v) => ({
      id: v.id,
      title: mainTrack.title,
      audio_url: v.audioUrl,
      cover_url: v.coverUrl,
      duration: v.duration,
      lyrics: v.lyrics,
      isMasterVersion: v.isPreferredVariant,
      parentTrackId: v.parentTrackId,
      versionNumber: v.variantIndex + 1,
      like_count: v.likeCount,
    }));
    return [mainAsVersion, ...variantsAsVersions];
  }, [variantsData]);

  const masterVersion: { id: string; versionNumber: number; isMasterVersion: boolean } | null = useMemo(() => {
    const master = allVersions.find(v => v.isMasterVersion);
    if (!master) return null;
    
    return {
      id: master.id,
      versionNumber: master.versionNumber,
      isMasterVersion: true,
    };
  }, [allVersions]);

  // Sync with audio player
  useEffect(() => {
    if (!currentTrack || !allVersions.length) {
      const masterIndex = allVersions.findIndex((v) => v.isMasterVersion);
      if (masterIndex !== -1 && masterIndex !== selectedVersionIndex) {
        setSelectedVersionIndex(masterIndex);
      }
      return;
    }

    const isCurrentTrack =
      currentTrack.parentTrackId === track.id || currentTrack.id === track.id;
    if (!isCurrentTrack) {
      const masterIndex = allVersions.findIndex((v) => v.isMasterVersion);
      if (masterIndex !== -1 && masterIndex !== selectedVersionIndex) {
        setSelectedVersionIndex(masterIndex);
      }
      return;
    }

    const currentVersionInAllVersions = allVersions.findIndex((v) => v.id === currentTrack.id);
    if (
      currentVersionInAllVersions !== -1 &&
      currentVersionInAllVersions !== selectedVersionIndex
    ) {
      setSelectedVersionIndex(currentVersionInAllVersions);
    }
  }, [currentTrack, track.id, allVersions, selectedVersionIndex]);

  useEffect(() => {
    if (selectedVersionIndex >= allVersions.length) {
      setSelectedVersionIndex(0);
    }
  }, [allVersions, selectedVersionIndex]);

  useEffect(() => {
    try {
      const key = `track:selectedVersion:${track.id}`;
      localStorage.setItem(key, String(selectedVersionIndex));
    } catch {
      // Silently ignore localStorage write errors
    }
  }, [track.id, selectedVersionIndex]);

  const displayedVersion = useMemo(() => {
    return allVersions[selectedVersionIndex] || {
        id: track.id,
        title: track.title,
        audio_url: track.audio_url,
        cover_url: track.cover_url,
        duration: track.duration,
        versionNumber: 1,
        isMasterVersion: false,
        parentTrackId: track.id,
        lyrics: null,
        like_count: 0,
      };
  }, [allVersions, selectedVersionIndex, track]);

  const { isLiked, likeCount, toggleLike } = useTrackVersionLike(
    displayedVersion.id,
    displayedVersion.like_count || 0
  );

  const operationTargetId = displayedVersion.id;
  const operationTargetVersion = displayedVersion;
  const isCurrentTrack = currentTrack?.id === displayedVersion.id;
  const playButtonDisabled = track.status !== 'completed' || !displayedVersion.audio_url;
  const uiVersionCount = variantsData?.variants.length ?? 0;

  const handleVersionChange = useCallback(
    (versionIndex: number) => {
      // Ensure versionIndex is valid
      const validVersions = allVersions.filter((v) => v.audio_url);
      const maxIndex = Math.max(0, validVersions.length - 1);
      const clamped = Math.max(0, Math.min(versionIndex, maxIndex));
      const newVersion = validVersions[clamped];

      if (!newVersion) {
        logger.error(
          'Version change failed - no valid version',
          new Error('Invalid version index'),
          'useTrackState',
          { trackId: track.id, versionIndex, maxIndex }
        );
        return;
      }

      // Update UI state
      setSelectedVersionIndex(clamped);

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
