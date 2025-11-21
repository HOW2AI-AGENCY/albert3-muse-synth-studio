import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Check,
} from "@/utils/iconImports";
import { TrackCard } from "@/features/tracks";
import { OptimizedTrackList } from "@/components/OptimizedTrackList";
import { LibrarySkeleton } from "@/components/skeletons/LibrarySkeleton";
import { TrackStatusMonitor } from "@/components/TrackStatusMonitor";
import {
  LazySeparateStemsDialog,
  LazyExtendTrackDialog,
  LazyCreateCoverDialog,
  LazyTrackDeleteDialog,
  LazyAddVocalDialog,
  LazyCreatePersonaDialog,
  LazyUpscaleAudioDialog
} from "@/components/LazyDialogs";
import { useTracks } from "@/hooks/useTracks";
import { useNotifications } from "@/hooks/useNotifications";
import { useTrackCleanup } from "@/hooks/useTrackCleanup";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { usePrefetchTracks } from "@/hooks/usePrefetchTracks";
// import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLibraryDialogs } from "@/hooks/useLibraryDialogs";
import { useLibraryFilters } from "@/hooks/useLibraryFilters";
// import { LikesService } from "@/services/likes.service"; // Now handled in TrackCard
import { supabase } from "@/integrations/supabase/client";
import { DisplayTrack, convertToAudioPlayerTrack, convertToDisplayTrack, convertToOptimizedTrack } from "@/types/track";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";
import { getTrackWithVariants, trackVersionsQueryKeys } from "@/features/tracks/api/trackVersions";
import { useQueryClient } from "@tanstack/react-query";
import type { AudioPlayerTrack } from "@/types/track";
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { VirtualizedTrackGrid } from '@/components/tracks/VirtualizedTrackGrid';
import { VirtualizedTrackList } from '@/components/tracks/VirtualizedTrackList';
import { useAuth } from "@/contexts/auth/useAuth";
import { SelectedTracksProvider, useSelectedTracks } from '@/contexts/SelectedTracksContext';
import { SelectionToolbar } from '@/components/tracks/SelectionToolbar';
// import type { SortBy } from '@/hooks/useLibraryFilters';
import { useGenerateCoverImage } from '@/hooks/useGenerateCoverImage';
import type { DisplayTrack as DisplayTrackType } from '@/types/track';
// import type { Track as DomainTrack } from '@/types/domain/track.types';

const LibraryContent: React.FC = () => {
  const { isSelectionMode, setSelectionMode, clearSelection } = useSelectedTracks();
  const {
    tracks,
    isLoading,
    refreshTracks,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    deleteTrack,
  } = useTracks(undefined, { pageSize: 30 });
  const notify = useNotifications();
  const playTrackWithQueue = useAudioPlayerStore((state) => state.playTrackWithQueue);
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const queryClient = useQueryClient();

  // Get current user
  const { userId } = useAuth();

  // Automatic cleanup of failed tracks
  // Ensure userId is string or undefined, not null
  useTrackCleanup(userId ?? undefined, refreshTracks);

  // ✅ OPTIMIZED: Use custom hooks to manage filters and dialogs
  const filters = useLibraryFilters({ tracks: tracks as DisplayTrackType[] });
  const dialogs = useLibraryDialogs();

  // Debounced search for better performance
  // const debouncedSearchQuery = useDebouncedValue(filters.searchQuery, 300);

  // Track loading state for individual tracks
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  // Container width tracking for responsive grid
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width with immediate initialization (FIX: prevents 0-width flash)
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = (width: number) => {
      if (width > 0 && width !== containerWidth) { // Only update if width is positive and has changed
        setContainerWidth(width);
      }
    };
    
    // ✅ FIX: Immediately set initial width to prevent single-column flash
    const initialWidth = containerRef.current.clientWidth;
    updateWidth(initialWidth); // Use the updateWidth function for initial set

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateWidth(entry.contentRect.width); // Use the updateWidth function for observer updates
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [containerWidth]); // Add containerWidth to dependencies to ensure updateWidth has the latest state

  // ✅ OPTIMIZED: Use filtered tracks from useLibraryFilters hook
  const filteredAndSortedTracks = filters.filteredTracks;

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
      const variantsData = await getTrackWithVariants(track.id);
      if (variantsData) {
        queryClient.setQueryData(trackVersionsQueryKeys.list(track.id), variantsData);

        const allVersions = [
          { ...variantsData.mainTrack },
          ...variantsData.variants.map(v => ({
            ...v,
            title: variantsData.mainTrack.title,
            styleTags: variantsData.mainTrack.styleTags,
            status: 'completed' as const,
          }))
        ];
        const audioTracks = allVersions.map(v => convertToAudioPlayerTrack({
          id: v.id,
          title: v.title,
          audio_url: v.audioUrl ?? null,
          cover_url: v.coverUrl ?? null,
          duration: v.duration ?? null,
          duration_seconds: v.duration ?? null,
          style_tags: v.styleTags ?? null,
          lyrics: v.lyrics ?? null,
          status: v.status ?? 'completed',
        })).filter((t): t is NonNullable<typeof t> => t !== null);

        const preferredOrMain = variantsData.preferredVariant || variantsData.mainTrack;
        const startTrack = audioTracks.find(t => t.id === preferredOrMain.id);
        const remainingTracks = filteredAndSortedTracks
          .filter(t => t.id !== track.id && t.audio_url)
          .map(displayTrack => mapDisplayTrackToAudio(displayTrack as DisplayTrackType))
          .filter((audioTrack): audioTrack is AudioPlayerTrack => Boolean(audioTrack));

        if (startTrack) {
          playTrackWithQueue(startTrack, [...audioTracks, ...remainingTracks]);
          return;
        }
      }

      const fallbackAudio = mapDisplayTrackToAudio(track);
      if (fallbackAudio) {
        const remainingTracks = filteredAndSortedTracks
          .filter(t => t.id !== track.id && t.audio_url)
          .map(displayTrack => mapDisplayTrackToAudio(displayTrack as DisplayTrackType))
          .filter((audioTrack): audioTrack is AudioPlayerTrack => Boolean(audioTrack));
        playTrackWithQueue(fallbackAudio, [fallbackAudio, ...remainingTracks]);
        return;
      }

      notify.error("Невозможно воспроизвести", "Не удалось найти доступные версии трека");
    } catch (error) {
      logger.error('Failed to load track versions', error instanceof Error ? error : new Error(`trackId: ${track.id}`));
      notify.error("Ошибка воспроизведения", "Не удалось загрузить версии трека");
    } finally {
      setLoadingTrackId(prev => (prev === currentTrackId ? null : prev));
    }
  }, [filteredAndSortedTracks, mapDisplayTrackToAudio, playTrackWithQueue, notify, queryClient]);

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


  // Calculate grid parameters (новая продвинутая версия)
  const gridParams = useResponsiveGrid(containerWidth);
  // Per the audit, we now force a single column on mobile for better UX.
  const effectiveColumns = gridParams.screenCategory === 'mobile' ? 1 : gridParams.columns;
  const shouldVirtualize = filteredAndSortedTracks.length > 50;
  
  // Prefetch adjacent tracks
  usePrefetchTracks(
    filteredAndSortedTracks.map(t => t as DisplayTrackType),
    currentTrack?.id ?? null,
    { enabled: true, prefetchCount: 3 }
  );

  const handleShare = useCallback(async (trackId: string) => {
    try {
      const track = tracks.find(t => t.id === trackId);
      if (!track) {
        notify.error("Ошибка", "Трек не найден");
        return;
      }

      // Check if track is public (some tracks may not have this field)
      const isPublic = Boolean(track.is_public);
      if (!isPublic) {
        notify.error("Трек приватный", "Сначала сделайте трек публичным, чтобы делиться им");
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
        
        notify.success("🔗 Ссылка скопирована", "Публичная ссылка скопирована в буфер обмена");

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
  }, [tracks, notify]);

  const handleSeparateStems = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    dialogs.openSeparateStems(trackId, track.title);
  }, [tracks, dialogs]);

  const handleExtend = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    dialogs.openExtend(convertToDisplayTrack(track));
  }, [tracks, dialogs]);

  const handleCover = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    dialogs.openCover(trackId, track.title);
  }, [tracks, dialogs]);

  const handleRetry = useCallback(async (trackId: string) => {
    try {
      const track = tracks.find(t => t.id === trackId);
      if (!track) return;

      notify.info("Повторная генерация", "Запускаем генерацию заново...");

      // Обновляем статус трека на pending
      await supabase
        .from('tracks')
        .update({ 
          status: 'pending',
          error_message: null 
        })
        .eq('id', trackId);

      await refreshTracks();
      
      logger.info('Track retry initiated', `trackId: ${trackId}`);
    } catch (error) {
      logger.error('Failed to retry track', error instanceof Error ? error : new Error(`trackId: ${trackId}`));
      notify.error("Ошибка", "Не удалось повторить генерацию");
    }
  }, [tracks, notify, refreshTracks]);

  const handleDelete = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    dialogs.openDelete(trackId, track.title);
  }, [tracks, dialogs]);

  const confirmDelete = useCallback(async () => {
    if (!dialogs.delete.data) return;

    try {
      await deleteTrack(dialogs.delete.data.id);
      dialogs.closeDelete();

      logger.info('Track deleted', `trackId: ${dialogs.delete.data.id}, title: ${dialogs.delete.data.title}`);
    } catch (error) {
      logger.error('Failed to delete track', error instanceof Error ? error : new Error(`trackId: ${dialogs.delete.data.id}`));
    }
  }, [dialogs, deleteTrack]);

  const handleAddVocal = useCallback((trackId: string) => {
    dialogs.openAddVocal(trackId);
  }, [dialogs]);

  const handleCreatePersona = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    dialogs.openCreatePersona(convertToDisplayTrack(track));
  }, [tracks, dialogs]);

  const handleUpscaleAudio = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    dialogs.openUpscale(track.id, track.title, track.audio_url);
  }, [tracks, dialogs]);

  const { generateCoverImage } = useGenerateCoverImage();
  const handleGenerateCover = useCallback(async (trackId: string) => {
    await generateCoverImage(trackId);
  }, [generateCoverImage]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <LibrarySkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in" role="main" aria-label="Библиотека треков">
      {/* Монитор застрявших треков */}
      {userId && <TrackStatusMonitor userId={userId} />}
      
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
              variant={filters.viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => filters.setViewMode('grid')}
              aria-label="Сетка"
              className="transition-all duration-300"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={filters.viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => filters.setViewMode('list')}
              aria-label="Список"
              className="transition-all duration-300"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={filters.viewMode === 'optimized' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => filters.setViewMode('optimized')}
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
                value={filters.searchQuery}
                onChange={(e) => filters.setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary/50 transition-all duration-300"
                aria-label="Поиск треков"
              />
            </div>

            {/* Фильтр по статусу */}
            <select
              value={filters.selectedStatus}
              onChange={(e) => filters.setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-border/30 rounded-md bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Фильтр по статусу"
            >
              <option value="all">Все статусы</option>
              {filters.availableStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            
            {/* Сортировка */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => filters.handleSortChange('created_at')}
                className={cn(
                  filters.sortBy === 'created_at' && 'bg-primary/10 border-primary/50',
                  "hover:scale-105 transition-all duration-300"
                )}
              >
                Дата {filters.sortBy === 'created_at' && (filters.sortOrder === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => filters.handleSortChange('title')}
                className={cn(
                  filters.sortBy === 'title' && 'bg-primary/10 border-primary/50',
                  "hover:scale-105 transition-all duration-300"
                )}
              >
                Название {filters.sortBy === 'title' && (filters.sortOrder === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isSelectionMode) {
                    clearSelection();
                  }
                  setSelectionMode(!isSelectionMode);
                }}
                className={cn(
                  isSelectionMode && 'bg-primary/10 border-primary/50',
                  "hover:scale-105 transition-all duration-300"
                )}
              >
                <Check className="h-4 w-4" />
                <span className="ml-1">Выбрать</span>
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
            {filters.searchQuery ? 'Треки не найдены' : 'Библиотека пуста'}
          </h3>
          <p className="text-muted-foreground max-w-md text-lg">
            {filters.searchQuery
              ? 'Попробуйте изменить поисковый запрос или фильтры'
              : 'Создайте свой первый AI-трек в разделе "Генерация"'
            }
          </p>
        </div>
      ) : (
        <>
          {filters.viewMode === 'grid' && (
            <div ref={containerRef} className="w-full">
              <div className="w-full" style={{ height: 'calc(100vh - 280px)' }}>
                {shouldVirtualize ? (
                  <VirtualizedTrackGrid
                    tracks={filteredAndSortedTracks as any}
                    columns={effectiveColumns}
                    gap={gridParams.gap}
                    onTrackPlay={handleTrackPlay}
                    onShare={handleShare}
                    onSeparateStems={handleSeparateStems}
                    onExtend={handleExtend}
                    onCover={handleCover}
                    onAddVocal={handleAddVocal}
                    onCreatePersona={handleCreatePersona}
                    onRetry={handleRetry}
                    onDelete={handleDelete}
                  />
                ) : (
                  <div
                    className="grid overflow-auto h-full scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
                    style={{
                      gridTemplateColumns: gridParams.screenCategory === 'mobile'
                        ? '1fr' // ✅ MOBILE: Single column, full width
                        : `repeat(${effectiveColumns}, minmax(${gridParams.screenCategory === 'tablet' ? 320 : 320}px, 1fr))`,
                      gap: `${gridParams.gap}px`,
                      justifyContent: 'center'
                    }}
                  >
                  {filteredAndSortedTracks.map((track) => (
                    <div key={track.id} className="relative w-full" aria-busy={loadingTrackId === track.id}>
                      <TrackCard
                        track={track as any}
                        onClick={() => handleTrackPlay(track as any)}
                        onShare={() => handleShare(track.id)}
                        onSeparateStems={() => handleSeparateStems(track.id)}
                        onExtend={() => handleExtend(track.id)}
                        onCover={() => handleCover(track.id)}
                        onAddVocal={() => handleAddVocal(track.id)}
                        onCreatePersona={() => handleCreatePersona(track.id)}
                        onUpscaleAudio={() => handleUpscaleAudio(track.id)}
                        onGenerateCover={() => handleGenerateCover(track.id)}
                        onRetry={handleRetry}
                        onDelete={handleDelete}
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
              </div>
            </div>
          )}

          {filters.viewMode === 'list' && (
            <div className="w-full" style={{ height: 'calc(100vh - 280px)' }}>
              <VirtualizedTrackList
                tracks={filteredAndSortedTracks as any}
                height={600}
                onTrackPlay={handleTrackPlay}
                onShare={handleShare}
                onSeparateStems={handleSeparateStems}
                onRetry={handleRetry}
                onDelete={handleDelete}
                loadingTrackId={loadingTrackId}
              />
            </div>
          )}

          {filters.viewMode === 'optimized' && (
            <OptimizedTrackList
              tracks={filteredAndSortedTracks.map(convertToOptimizedTrack)}
              onShare={handleShare}
            />
          )}
        </>
      )}

      {hasNextPage && filteredAndSortedTracks.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="min-w-[200px]"
          >
            {isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
          </Button>
        </div>
      )}

      {/* Диалоги */}
      {dialogs.separateStems.isOpen && dialogs.separateStems.data && (
        <LazySeparateStemsDialog
          open={dialogs.separateStems.isOpen}
          onOpenChange={dialogs.closeSeparateStems}
          trackId={dialogs.separateStems.data.id}
          trackTitle={dialogs.separateStems.data.title}
          onSuccess={() => {
            refreshTracks();
            dialogs.closeSeparateStems();
          }}
        />
      )}

      {dialogs.extend.isOpen && dialogs.extend.data && (
        <LazyExtendTrackDialog
          open={dialogs.extend.isOpen}
          onOpenChange={dialogs.closeExtend}
          track={{
            id: dialogs.extend.data.id,
            title: dialogs.extend.data.title,
            duration: dialogs.extend.data.duration || dialogs.extend.data.duration_seconds,
            prompt: dialogs.extend.data.prompt,
            style_tags: dialogs.extend.data.style_tags,
          }}
        />
      )}

      {dialogs.cover.isOpen && dialogs.cover.data && (
        <LazyCreateCoverDialog
          open={dialogs.cover.isOpen}
          onOpenChange={dialogs.closeCover}
          track={{
            id: dialogs.cover.data.id,
            title: dialogs.cover.data.title,
          }}
        />
      )}

      {dialogs.addVocal.isOpen && dialogs.addVocal.data && (
        <LazyAddVocalDialog
          open={dialogs.addVocal.isOpen}
          onOpenChange={dialogs.closeAddVocal}
          trackId={dialogs.addVocal.data}
          onSuccess={() => {
            refreshTracks();
          }}
        />
      )}

      {dialogs.createPersona.isOpen && dialogs.createPersona.data && (
        <LazyCreatePersonaDialog
          open={dialogs.createPersona.isOpen}
          onOpenChange={dialogs.closeCreatePersona}
          track={{
            id: dialogs.createPersona.data.id,
            title: dialogs.createPersona.data.title,
          }}
          onSuccess={() => {
            dialogs.closeCreatePersona();
          }}
        />
      )}

      {dialogs.upscale.isOpen && dialogs.upscale.data && (
        <LazyUpscaleAudioDialog
          open={dialogs.upscale.isOpen}
          onOpenChange={dialogs.closeUpscale}
          trackTitle={dialogs.upscale.data.title}
          audioUrl={dialogs.upscale.data.audioUrl}
        />
      )}

      {dialogs.delete.isOpen && dialogs.delete.data && (
        <LazyTrackDeleteDialog
          open={dialogs.delete.isOpen}
          onOpenChange={dialogs.closeDelete}
          trackId={dialogs.delete.data.id}
          trackTitle={dialogs.delete.data.title}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

const Library: React.FC = () => {
  return (
    <SelectedTracksProvider>
      <div className="relative">
        <LibraryContent />
        {/* ✅ FIX P0.2: Removed z-50, now handled by SelectionToolbar component */}
        <SelectionToolbar />
      </div>
    </SelectedTracksProvider>
  );
};

export default Library;
