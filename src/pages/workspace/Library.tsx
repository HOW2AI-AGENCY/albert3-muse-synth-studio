import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
import {
  Search,
  // Filter,
  Music,
  RefreshCcw,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Loader2,
} from "lucide-react";
import { TrackCard, TrackListItem } from "@/features/tracks";
import { OptimizedTrackList } from "@/components/OptimizedTrackList";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useTracks } from "@/hooks/useTracks";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
// import { LikesService } from "@/services/likes.service"; // Now handled in TrackCard
import { supabase } from "@/integrations/supabase/client";
import { DisplayTrack, convertToAudioPlayerTrack, convertToDisplayTrack, convertToOptimizedTrack } from "@/types/track";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";
import { normalizeTrack } from "@/utils/trackNormalizer";
import { getTrackWithVersions } from "@/features/tracks/api/trackVersions";
import { primeTrackVersionsCache } from "@/features/tracks/hooks/useTrackVersions";
import type { AudioPlayerTrack } from "@/types/track";

type ViewMode = 'grid' | 'list' | 'optimized';
type SortBy = 'created_at' | 'title' | 'duration' | 'like_count';
type SortOrder = 'asc' | 'desc';

const Library: React.FC = () => {
  const { tracks, isLoading, refreshTracks } = useTracks();
  const { toast } = useToast();
  const { playTrackWithQueue } = useAudioPlayer();
  
  // Состояние UI
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('library-view-mode');
    return (saved as ViewMode) || 'grid';
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  
  // Сохранение настроек просмотра
  useEffect(() => {
    localStorage.setItem('library-view-mode', viewMode);
  }, [viewMode]);

  // Мемоизированная фильтрация и сортировка треков
  const filteredAndSortedTracks = useMemo(() => {
    const filtered = tracks.filter(track => {
      const matchesSearch = !searchQuery || 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.style_tags && track.style_tags.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      
      const matchesStatus = selectedStatus === 'all' || track.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Сортировка
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'like_count':
          aValue = a.like_count || 0;
          bValue = b.like_count || 0;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tracks, searchQuery, selectedStatus, sortBy, sortOrder]);

  // Обработчики событий
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleSortChange = useCallback((newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  }, [sortBy]);

  const mapDisplayTrackToAudio = useCallback((item: DisplayTrack): AudioPlayerTrack | null => {
    return convertToAudioPlayerTrack({
      id: item.id,
      title: item.title,
      audio_url: item.audio_url ?? null,
      cover_url: item.cover_url ?? null,
      duration: item.duration ?? item.duration_seconds ?? null,
      duration_seconds: item.duration_seconds ?? null,
      style_tags: item.style_tags ?? null,
      status: item.status ?? null,
    }) as AudioPlayerTrack | null;
  }, []);

  const handleTrackPlay = useCallback(async (track: DisplayTrack) => {
    if (!track.audio_url || track.status !== 'completed') {
      return;
    }

    const currentTrackId = track.id;
    setLoadingTrackId(currentTrackId);

    try {
      const tracksWithVersions = await getTrackWithVersions(track.id);
      primeTrackVersionsCache(track.id, tracksWithVersions);
      const playableVersionEntries = tracksWithVersions
        .map(version => {
          const audio = convertToAudioPlayerTrack({
            id: version.id,
            title: version.title,
            audio_url: version.audio_url ?? null,
            cover_url: version.cover_url ?? null,
            duration: version.duration ?? null,
            duration_seconds: version.duration ?? null,
            style_tags: version.style_tags ?? null,
            lyrics: version.lyrics ?? null,
            status: version.status ?? 'completed',
          });

          if (!audio) {
            return null;
          }

          return {
            version,
            audio: {
              ...audio,
              parentTrackId: version.parentTrackId,
              versionNumber: version.versionNumber,
              isMasterVersion: version.isMasterVersion,
              isOriginalVersion: version.isOriginal,
              sourceVersionNumber: version.sourceVersionNumber,
            },
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.audio !== null);

      const masterEntry = playableVersionEntries.find(entry => entry.version.isMasterVersion) ??
        playableVersionEntries.find(entry => entry.version.isOriginal) ??
        playableVersionEntries[0] ??
        null;

      const otherVersionTracks = playableVersionEntries
        .filter(entry => masterEntry ? entry.version.id !== masterEntry.version.id : true)
        .map(entry => entry.audio);

      const remainingTracks = filteredAndSortedTracks
        .filter(t => t.id !== track.id && t.audio_url)
        .map(displayTrack => mapDisplayTrackToAudio(convertToDisplayTrack(displayTrack)))
        .filter((audioTrack): audioTrack is AudioPlayerTrack => Boolean(audioTrack));

      if (masterEntry) {
        const queue = [masterEntry.audio, ...otherVersionTracks, ...remainingTracks];
        playTrackWithQueue(masterEntry.audio, queue);
        return;
      }

      const fallbackAudio = mapDisplayTrackToAudio(track);
      if (fallbackAudio) {
        const queue = [fallbackAudio, ...otherVersionTracks, ...remainingTracks];
        playTrackWithQueue(fallbackAudio, queue);
        return;
      }

      toast({
        title: "Невозможно воспроизвести",
        description: "Не удалось найти доступные версии трека",
        variant: "destructive",
      });
    } catch (error) {
      logger.error('Failed to load track versions', error instanceof Error ? error : new Error(`trackId: ${track.id}`));
      toast({
        title: "Ошибка воспроизведения",
        description: "Не удалось загрузить версии трека",
        variant: "destructive",
      });
    } finally {
      setLoadingTrackId(prev => (prev === currentTrackId ? null : prev));
    }
  }, [filteredAndSortedTracks, mapDisplayTrackToAudio, playTrackWithQueue, toast]);

  // handleLike is now handled by useTrackLike hook in TrackCard
  // const handleLike = useCallback(async (trackId: string) => {
  //   try {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (!user) {
  //       toast({
  //         title: "Требуется авторизация",
  //         description: "Войдите в систему, чтобы ставить лайки",
  //         variant: "destructive",
  //       });
  //       return;
  //     }
  //
  //     const isNowLiked = await LikesService.toggleLike(trackId, user.id);
  //     
  //     toast({
  //       title: isNowLiked ? "❤️ Добавлено в избранное" : "Удалено из избранного",
  //       description: isNowLiked 
  //         ? "Трек сохранен в вашей коллекции" 
  //         : "Трек удален из избранного",
  //     });
  //
  //     // Refresh tracks to update like count
  //     await refreshTracks();
  //     
  //     logger.info('Track like toggled', `trackId: ${trackId}, isNowLiked: ${isNowLiked}, userId: ${user.id}`);
  //   } catch (error) {
  //     logger.error('Failed to toggle like', error instanceof Error ? error : new Error(`trackId: ${trackId}`));
  //     toast({
  //       title: "Ошибка",
  //       description: "Не удалось обновить статус лайка",
  //       variant: "destructive",
  //     });
  //   }
  // }, [toast, refreshTracks]);

  const handleDownload = useCallback(async (trackId: string) => {
    try {
      const track = tracks.find(t => t.id === trackId);
      if (!track || !track.audio_url) {
        toast({
          title: "Ошибка",
          description: "Аудиофайл недоступен для скачивания",
          variant: "destructive",
        });
        return;
      }

      // Show loading toast
      toast({
        title: "Загрузка...",
        description: "Подготовка файла к скачиванию",
      });

      // Fetch the audio file
      const response = await fetch(track.audio_url);
      if (!response.ok) throw new Error('Failed to fetch audio');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Increment download count in database
      await supabase.rpc('increment_download_count', { track_id: trackId });

      toast({
        title: "✅ Скачано",
        description: `Трек "${track.title}" успешно загружен`,
      });

      logger.info('Track downloaded', `trackId: ${trackId}, title: ${track.title}`);
    } catch (error) {
      logger.error('Failed to download track', error instanceof Error ? error : new Error(`trackId: ${trackId}`));
      toast({
        title: "Ошибка",
        description: "Не удалось скачать трек. Попробуйте позже",
        variant: "destructive",
      });
    }
  }, [tracks, toast]);

  const handleShare = useCallback(async (trackId: string) => {
    try {
      const track = tracks.find(t => t.id === trackId);
      if (!track) {
        toast({
          title: "Ошибка",
          description: "Трек не найден",
          variant: "destructive",
        });
        return;
      }

      // Check if track is public (some tracks may not have this field)
      const isPublic = Boolean(track.is_public);
      if (!isPublic) {
        toast({
          title: "Трек приватный",
          description: "Сначала сделайте трек публичным, чтобы делиться им",
          variant: "destructive",
        });
        return;
      }

      // Generate shareable link
      const shareUrl = `${window.location.origin}/track/${trackId}`;

      // Try to use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: track.title,
          text: `Послушайте этот трек: ${track.title}`,
          url: shareUrl,
        });
        
        logger.info('Track shared via Web Share API', `trackId: ${trackId}`);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        
        toast({
          title: "🔗 Ссылка скопирована",
          description: "Публичная ссылка скопирована в буфер обмена",
        });

        logger.info('Track share link copied', `trackId: ${trackId}, shareUrl: ${shareUrl}`);
      }
    } catch (error) {
      logger.error('Failed to share track', error instanceof Error ? error : new Error(`trackId: ${trackId}`));
      
      // Fallback for clipboard error
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const shareUrl = `${window.location.origin}/track/${trackId}`;
        prompt('Скопируйте ссылку:', shareUrl);
      }
    }
  }, [tracks, toast]);

  // Уникальные статусы для фильтра
  const availableStatuses = useMemo(() => {
    const statuses = new Set(tracks.map(track => track.status));
    return Array.from(statuses);
  }, [tracks]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <LoadingSkeleton width="200px" height="32px" />
          <LoadingSkeleton width="120px" height="32px" />
        </div>
        
        <div className="flex gap-4">
          <LoadingSkeleton width="300px" height="40px" />
          <LoadingSkeleton width="100px" height="40px" />
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="rectangular" height="300px" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="track-item" />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in" role="main" aria-label="Библиотека треков">
      {/* Заголовок и статистика */}
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gradient-primary">
              Библиотека
            </h1>
            <p className="text-muted-foreground mt-1">
              {tracks.length} {tracks.length === 1 ? "трек" : "треков"} всего
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={refreshTracks}
            aria-label="Обновить список треков"
            className="hover:scale-105 transition-all duration-300"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          
          {/* Переключатель вида */}
          <div className="flex items-center border border-border/30 rounded-lg p-1 bg-background/50 backdrop-blur-sm">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('grid')}
              aria-label="Сетка"
              className="transition-all duration-300"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('list')}
              aria-label="Список"
              className="transition-all duration-300"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'optimized' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('optimized')}
              aria-label="Оптимизированный список"
              className="transition-all duration-300"
            >
              <Music className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <Card variant="modern" className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Поиск */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary animate-pulse" />
              <Input
                placeholder="Поиск по названию или тегам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary/50 transition-all duration-300"
                aria-label="Поиск треков"
              />
            </div>
            
            {/* Фильтр по статусу */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-border/30 rounded-md bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Фильтр по статусу"
            >
              <option value="all">Все статусы</option>
              {availableStatuses.map(status => (
                <option key={status} value={status}>
                  {status === 'completed' ? 'Завершено' : 
                   status === 'processing' ? 'Обработка' : 
                   status === 'pending' ? 'Ожидание' : status}
                </option>
              ))}
            </select>
            
            {/* Сортировка */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('created_at')}
                className={cn(
                  sortBy === 'created_at' && 'bg-primary/10 border-primary/50',
                  "hover:scale-105 transition-all duration-300"
                )}
              >
                Дата {sortBy === 'created_at' && (sortOrder === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('title')}
                className={cn(
                  sortBy === 'title' && 'bg-primary/10 border-primary/50',
                  "hover:scale-105 transition-all duration-300"
                )}
              >
                Название {sortBy === 'title' && (sortOrder === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список треков */}
      {filteredAndSortedTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="relative mb-6 animate-float">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-2xl" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-primary/20">
              <Music className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h3 className="text-3xl font-black mb-3 text-gradient-primary">
            {searchQuery ? 'Треки не найдены' : 'Библиотека пуста'}
          </h3>
          <p className="text-muted-foreground max-w-md text-lg">
            {searchQuery 
              ? 'Попробуйте изменить поисковый запрос или фильтры'
              : 'Создайте свой первый AI-трек в разделе "Генерация"'
            }
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedTracks.map((track) => (
                <div key={track.id} className="relative" aria-busy={loadingTrackId === track.id}>
                  <TrackCard
                    track={normalizeTrack(track)}
                    onClick={() => handleTrackPlay(convertToDisplayTrack(track))}
                    onDownload={() => handleDownload(track.id)}
                    onShare={() => handleShare(track.id)}
                  />
                  {loadingTrackId === track.id && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-3xl bg-background/80 backdrop-blur-sm">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">Загрузка версий…</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {viewMode === 'list' && (
            <div className="space-y-2">
              {filteredAndSortedTracks.map((track, index) => (
                <div key={track.id} className="relative" aria-busy={loadingTrackId === track.id}>
                  <TrackListItem
                    track={convertToDisplayTrack(track)}
                    index={index}
                    onDownload={() => handleDownload(track.id)}
                    onShare={() => handleShare(track.id)}
                    onClick={() => handleTrackPlay(convertToDisplayTrack(track))}
                  />
                  {loadingTrackId === track.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">Загрузка версий…</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {viewMode === 'optimized' && (
            <OptimizedTrackList
              tracks={filteredAndSortedTracks.map(convertToOptimizedTrack)}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Library;