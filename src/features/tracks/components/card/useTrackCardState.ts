import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentTrack, useIsPlaying, useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useTrackLike, useTrackVersions } from '@/features/tracks/hooks';
import { useToast } from '@/hooks/use-toast';
import { logInfo } from '@/utils/logger';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  cover_url?: string;
  duration?: number;
  status: string;
  style_tags?: string[];
  like_count?: number;
  is_public?: boolean;
  metadata?: Record<string, any> | null;
}

export const useTrackCardState = (track: Track) => {
  const { toast } = useToast();
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);

  const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const { versions, mainVersion, versionCount, masterVersion } = useTrackVersions(track.id, true);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasStems, setHasStems] = useState(false);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);

  // Check for stems
  useEffect(() => {
    const checkStems = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('track_stems')
        .select('id')
        .eq('track_id', track.id)
        .limit(1);
      setHasStems((data?.length || 0) > 0);
    };
    checkStems();
  }, [track.id]);

  // ✅ FIX: Фильтруем только версии с audio_url
  const allVersions = useMemo(() => {
    if (!mainVersion) return [];
    const validVersions = [mainVersion, ...versions].filter(v => !!v.audio_url);
    return validVersions;
  }, [mainVersion, versions]);

  // ✅ FIX: Синхронизировать selectedVersionIndex с текущим треком в плеере
  useEffect(() => {
    if (!currentTrack || !allVersions.length) return;
    
    const isCurrentTrack = currentTrack.parentTrackId === track.id || currentTrack.id === track.id;
    if (!isCurrentTrack) return;
    
    const currentVersionInAllVersions = allVersions.findIndex(
      v => v.id === currentTrack.id
    );
    
    if (currentVersionInAllVersions !== -1 && currentVersionInAllVersions !== selectedVersionIndex) {
      setSelectedVersionIndex(currentVersionInAllVersions);
    }
  }, [currentTrack, track.id, allVersions, selectedVersionIndex]);

  // Auto-switch to master version
  useEffect(() => {
    const isTrackPlaying = currentTrack?.parentTrackId === track.id || currentTrack?.id === track.id;
    if (masterVersion && !isTrackPlaying && allVersions.length > 0) {
      const masterIndex = allVersions.findIndex((v) => v.id === masterVersion.id);
      if (masterIndex !== -1 && masterIndex !== selectedVersionIndex) {
        logInfo('Auto-switching to master version', 'TrackCard', {
          trackId: track.id,
          masterVersionId: masterVersion.id,
          fromIndex: selectedVersionIndex,
          toIndex: masterIndex,
        });
        setSelectedVersionIndex(masterIndex);
      }
    }
  }, [masterVersion?.id, track.id]);

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
        versionNumber: 0,
        isOriginal: true,
        isMasterVersion: false,
        parentTrackId: track.id,
      }
    );
  }, [allVersions, selectedVersionIndex, mainVersion, track]);

  // Operation target
  const operationTargetId = useMemo(() => {
    return masterVersion?.id || mainVersion?.id || track.id;
  }, [masterVersion, mainVersion, track.id]);

  const operationTargetVersion = useMemo(() => {
    return masterVersion || mainVersion || displayedVersion;
  }, [masterVersion, mainVersion, displayedVersion]);

  const isCurrentTrack = currentTrack?.id === displayedVersion.id;
  const playButtonDisabled = track.status !== 'completed' || !displayedVersion.audio_url;

  const handleVersionChange = useCallback((versionIndex: number) => {
    setSelectedVersionIndex(versionIndex);
  }, []);

  const handlePlayClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (playButtonDisabled) return;

      const audioTrack = {
        id: displayedVersion.id,
        title: displayedVersion.title || track.title,
        audio_url: displayedVersion.audio_url || '',
        cover_url: displayedVersion.cover_url || track.cover_url,
        duration: displayedVersion.duration || track.duration,
        status: 'completed' as const,
        style_tags: track.style_tags || [],
        lyrics: displayedVersion.lyrics,
        parentTrackId: track.id,
        versionNumber: displayedVersion.versionNumber,
        isMasterVersion: displayedVersion.isMasterVersion,
        isOriginalVersion: displayedVersion.isOriginal,
      };
      playTrack(audioTrack);
    },
    [playButtonDisabled, displayedVersion, track, playTrack]
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
  }, [displayedVersion, track.title, toast]);

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
      const { logError } = await import('@/utils/logger');
      logError('Failed to toggle track public status', error as Error, 'TrackCard');
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус публикации',
        variant: 'destructive',
      });
    }
  }, [track.id, track.is_public, toast]);

  return {
    // State
    isHovered,
    setIsHovered,
    isVisible,
    setIsVisible,
    hasStems,
    selectedVersionIndex,
    isLiked,
    versionCount,
    masterVersion,
    displayedVersion,
    operationTargetId,
    operationTargetVersion,
    isCurrentTrack,
    isPlaying,
    playButtonDisabled,
    
    // Handlers
    handleVersionChange,
    handlePlayClick,
    handleLikeClick,
    handleDownloadClick,
    handleTogglePublic,
  };
};
