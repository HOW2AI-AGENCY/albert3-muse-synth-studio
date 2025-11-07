import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentTrack, useIsPlaying, useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useTrackVersions } from '@/features/tracks/hooks';
import { useTrackVersionLike } from '@/features/tracks/hooks/useTrackVersionLike';
import { useToast } from '@/hooks/use-toast';
import type { Track } from '@/types/domain/track.types';

export const useTrackCardState = (track: Track) => {
  const { toast } = useToast();
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);

  const { versions, mainVersion, versionCount, masterVersion } = useTrackVersions(track.id, true);
  
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
        // We can't validate against allVersions.length here as it's not available yet.
        // Validation will happen in the useEffect below.
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

  // ✅ FIX: Синхронизация с плеером
  useEffect(() => {
    if (!currentTrack || !allVersions.length) {
      // ✅ Если трек неактивен, возвращаемся к мастер-версии
      const masterIndex = allVersions.findIndex(v => v.isMasterVersion);
      if (masterIndex !== -1 && masterIndex !== selectedVersionIndex) {
        setSelectedVersionIndex(masterIndex);
      }
      return;
    }
    
    const isCurrentTrack = currentTrack.parentTrackId === track.id || currentTrack.id === track.id;
    if (!isCurrentTrack) {
      // ✅ Если трек неактивен, возвращаемся к мастер-версии
      const masterIndex = allVersions.findIndex(v => v.isMasterVersion);
      if (masterIndex !== -1 && masterIndex !== selectedVersionIndex) {
        setSelectedVersionIndex(masterIndex);
      }
      return;
    }
    
    // ✅ Если трек активен, синхронизируем с плеером
    const currentVersionInAllVersions = allVersions.findIndex(
      v => v.id === currentTrack.id
    );
    
    if (currentVersionInAllVersions !== -1 && currentVersionInAllVersions !== selectedVersionIndex) {
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
      }
    );
  }, [allVersions, selectedVersionIndex, mainVersion, track]);

  // ✅ FIX: Лайки применяются к активной версии, а не к треку целиком
  const { isLiked, likeCount, toggleLike } = useTrackVersionLike(
    displayedVersion?.id || null, 
    0 // Initial like count (will be loaded from DB)
  );

  // ✅ FIX: Контекстное меню применяется к displayedVersion
  const operationTargetId = useMemo(() => {
    return displayedVersion.id;
  }, [displayedVersion.id]);

  const operationTargetVersion = useMemo(() => {
    return displayedVersion;
  }, [displayedVersion]);

  const isCurrentTrack = currentTrack?.id === displayedVersion.id;
  const playButtonDisabled = track.status !== 'completed' || !displayedVersion.audio_url;

  // ✅ FIX: Используем versionCount из хука, который правильно фильтрует версии (sourceVersionNumber >= 1)
  // versionCount - это количество дополнительных версий (без основной)
  // Отображаем только количество ДОПОЛНИТЕЛЬНЫХ версий, без учета основной
  const uiVersionCount = useMemo(() => {
    return versionCount; // Показываем только дополнительные версии
  }, [versionCount]);

  const handleVersionChange = useCallback((versionIndex: number) => {
    // ✅ FIX: Используем правильное количество версий без дубликатов
    const maxIndex = Math.max(0, allVersions.filter(v => v.audio_url).length - 1);
    const clamped = Math.max(0, Math.min(versionIndex, maxIndex));
    setSelectedVersionIndex(clamped);
  }, [allVersions]);

  const handlePlayClick = useCallback(
    (event: React.MouseEvent) => {
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
    isLiked, // ✅ Лайк для активной версии
    likeCount, // ✅ Количество лайков для активной версии
    versionCount: uiVersionCount,
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
    handleLikeClick, // ✅ Лайк для активной версии
    handleDownloadClick,
    handleTogglePublic,
  };
};
