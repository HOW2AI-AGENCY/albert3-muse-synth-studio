import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentTrack, useIsPlaying, useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useTrackVariants } from '@/features/tracks/hooks';
import { useTrackVersionLike } from '@/features/tracks/hooks/useTrackVersionLike';
import { useToast } from '@/hooks/use-toast';
import type { Track } from '@/types/domain/track.types';

export const useTrackCardState = (track: Track) => {
  const { toast } = useToast();
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);

  const { data: variantsData } = useTrackVariants(track.id, true);

  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasStems, setHasStems] = useState(false);

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
      likeCount: 0, // ✅ Main track doesn't have like_count in variants
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
      likeCount: v.likeCount || 0, // ✅ Variant like count
    }));
    return [mainAsVersion, ...variantsAsVersions];
  }, [variantsData]);

  const [selectedVersionIndex, setSelectedVersionIndex] = useState(() => {
    try {
      const key = `track:selectedVersion:${track.id}`;
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = Number(stored);
        return Number.isNaN(parsed) ? 0 : parsed;
      }
    } catch {}
    return 0;
  });

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

  useEffect(() => {
    if (!currentTrack || !allVersions.length) {
      const masterIndex = allVersions.findIndex(v => v.isMasterVersion);
      if (masterIndex !== -1 && masterIndex !== selectedVersionIndex) {
        setSelectedVersionIndex(masterIndex);
      }
      return;
    }

    const isCurrentTrack = currentTrack.parentTrackId === track.id || currentTrack.id === track.id;
    if (!isCurrentTrack) {
      const masterIndex = allVersions.findIndex(v => v.isMasterVersion);
      if (masterIndex !== -1 && masterIndex !== selectedVersionIndex) {
        setSelectedVersionIndex(masterIndex);
      }
      return;
    }

    const currentVersionInAllVersions = allVersions.findIndex(v => v.id === currentTrack.id);
    if (currentVersionInAllVersions !== -1 && currentVersionInAllVersions !== selectedVersionIndex) {
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
    } catch {}
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
      likeCount: 0, // ✅ Default like count
    };
  }, [allVersions, selectedVersionIndex, track]);

  const masterVersion: { id: string; versionNumber: number; isMasterVersion: boolean } | null = useMemo(() => {
    const master = allVersions.find(v => v.isMasterVersion);
    if (!master) return null;
    
    return {
      id: master.id,
      versionNumber: master.versionNumber,
      isMasterVersion: true,
    };
  }, [allVersions]);

  // ✅ Use like count from displayed version
  const { isLiked, likeCount, toggleLike } = useTrackVersionLike(
    displayedVersion?.id || null, 
    displayedVersion?.likeCount || 0
  );

  const operationTargetId = displayedVersion.id;
  const operationTargetVersion = displayedVersion;
  const isCurrentTrack = currentTrack?.id === displayedVersion.id;
  const playButtonDisabled = track.status !== 'completed' || !displayedVersion.audio_url;
  const uiVersionCount = variantsData?.variants.length ?? 0;

  const handleVersionChange = useCallback((versionIndex: number) => {
    const maxIndex = Math.max(0, allVersions.filter(v => v.audio_url).length - 1);
    const clamped = Math.max(0, Math.min(versionIndex, maxIndex));
    const newVersion = allVersions[clamped];

    setSelectedVersionIndex(clamped);

    const isThisTrackActive = currentTrack?.id === track.id || currentTrack?.parentTrackId === track.id || currentTrack?.id === newVersion?.id;
    if (isThisTrackActive && newVersion?.id && newVersion.audio_url) {
      switchToVersion(newVersion.id);
    }
  }, [allVersions, currentTrack, track.id, switchToVersion]);

  const handlePlayClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (playButtonDisabled) return;

    const audioTrack = {
      id: displayedVersion.id,
      title: displayedVersion.title || track.title,
      audio_url: displayedVersion.audio_url || '',
      cover_url: displayedVersion.cover_url || track.cover_url || undefined,
      duration: displayedVersion.duration || track.duration || undefined,
      status: 'completed' as const,
      style_tags: track.style_tags || [],
      lyrics: displayedVersion.lyrics,
      parentTrackId: track.id,
      versionNumber: displayedVersion.versionNumber,
      isMasterVersion: displayedVersion.isMasterVersion,
    };
    playTrack(audioTrack);
  }, [playButtonDisabled, displayedVersion, track, playTrack]);

  const handleLikeClick = useCallback(() => {
    toggleLike();
  }, [toggleLike]);

  const handleDownloadClick = useCallback(() => {
    if (!displayedVersion.audio_url) {
      toast({ title: 'Ошибка', description: 'Аудиофайл недоступен', variant: 'destructive' });
      return;
    }
    const link = document.createElement('a');
    link.href = displayedVersion.audio_url;
    link.download = `${displayedVersion.title || track.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Скачивание начато', description: `${displayedVersion.title || track.title}` });
  }, [displayedVersion, track.title, toast]);

  const handleTogglePublic = useCallback(async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.from('tracks').update({ is_public: !track.is_public }).eq('id', track.id);
      if (error) throw error;
      toast({
        title: track.is_public ? 'Трек скрыт' : 'Трек опубликован',
        description: track.is_public ? 'Трек теперь виден только вам' : 'Трек теперь доступен всем пользователям',
      });
    } catch (error) {
      const { logError } = await import('@/utils/logger');
      logError('Failed to toggle track public status', error as Error, 'TrackCard');
      toast({ title: 'Ошибка', description: 'Не удалось изменить статус публикации', variant: 'destructive' });
    }
  }, [track.id, track.is_public, toast]);

  return {
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
    handleVersionChange,
    handlePlayClick,
    handleLikeClick,
    handleDownloadClick,
    handleTogglePublic,
  };
};
