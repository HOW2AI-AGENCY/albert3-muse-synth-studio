import { useState, memo, useCallback, useRef, useEffect, useMemo } from "react";
import { TrackCard } from "@/features/tracks/components/TrackCard";
import { TrackListItem } from "@/features/tracks/components/TrackListItem";
import { VirtualizedTrackGrid } from "./tracks/VirtualizedTrackGrid";
import { ViewSwitcher } from "./tracks/ViewSwitcher";
import { TrackListSkeleton } from "@/components/skeletons";
import { Track } from "@/services/api.service";
import { Music } from "@/utils/iconImports";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { supabase } from "@/integrations/supabase/client";
import { useManualSyncTrack } from "@/hooks/useManualSyncTrack";
import { logger } from "@/utils/logger";
import { AITrackActionsContainer } from "@/components/tracks/AITrackActionsContainer";
import { useAdaptiveGrid } from "@/hooks/useAdaptiveGrid";

interface TracksListProps {
  tracks: Track[];
  isLoading: boolean;
  deleteTrack: (trackId: string) => Promise<void>;
  refreshTracks: () => void;
  onSeparateStems?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onSelect?: (track: Track) => void;
  isDetailPanelOpen?: boolean;
}

const TracksListComponent = ({
  tracks,
  isLoading,
  deleteTrack,
  refreshTracks,
  onSeparateStems,
  onExtend,
  onCover,
  onCreatePersona,
  onSelect,
  isDetailPanelOpen = false,
}: TracksListProps) => {
  const playTrackWithQueue = useAudioPlayerStore((state) => state.playTrackWithQueue);
  const { toast } = useToast();
  const { mutateAsync: syncTrack } = useManualSyncTrack();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('tracks-view-mode') : 'grid';
      return (saved as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });

  // Track container dimensions for virtualization
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width, height: Math.max(height, 600) });
      }
    };

    // Initial measurement
    updateDimensions();
    
    // Use ResizeObserver for precise tracking
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Adaptive grid parameters (cardWidth used only for non-virtualized grid)
  const { columns, gap } = useAdaptiveGrid(containerDimensions.width, { 
    isDetailPanelOpen 
  });

  const handleViewChange = useCallback((view: 'grid' | 'list') => {
    setViewMode(view);
    try {
      localStorage.setItem('tracks-view-mode', view);
    } catch {}
  }, []);

  // ✅ Мемоизация списка воспроизводимых треков
  const playableTracks = useMemo(() => 
    tracks
      .filter(t => t.status === 'completed' && t.audio_url)
      .map(t => ({
        id: t.id,
        title: t.title,
        audio_url: t.audio_url!,
        cover_url: t.cover_url || undefined,
        duration: t.duration || undefined,
      })),
    [tracks]
  );

  const handlePlay = useCallback((track: Track) => {
    playTrackWithQueue({
      id: track.id,
      title: track.title,
      audio_url: track.audio_url!,
      cover_url: track.cover_url || undefined,
      duration: track.duration || undefined,
    }, playableTracks);
  }, [playableTracks, playTrackWithQueue]);


  const handleShare = useCallback((trackId: string) => {
    const url = `${window.location.origin}/track/${trackId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Ссылка скопирована" });
  }, [toast]);

  const handleRetry = useCallback(async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Ошибка", description: "Необходима авторизация", variant: "destructive" });
        return;
      }

      toast({ title: "Повторная генерация", description: "Запускаем генерацию заново..." });

      const provider = track.provider === 'suno' || track.provider === 'mureka'
        ? track.provider
        : 'suno';

      const { GenerationService } = await import('@/services/generation');
      await GenerationService.generate({
        title: track.title,
        prompt: track.prompt,
        provider: provider as any,
        lyrics: track.lyrics || undefined,
        hasVocals: track.has_vocals ?? false,
        styleTags: track.style_tags || undefined,
      });

      refreshTracks();
      toast({ title: "Успешно", description: "Генерация перезапущена" });
    } catch (error) {
      import('@/utils/logger').then(({ logError }) => {
        logError('Track retry failed', error as Error, 'TracksList', {
          trackId,
          title: track.title,
          provider: track.provider
        });
      });
      toast({ 
        title: "Ошибка", 
        description: error instanceof Error ? error.message : "Не удалось перезапустить генерацию", 
        variant: "destructive" 
      });
    }
  }, [tracks, toast, refreshTracks]);

  const handleSync = useCallback(async (trackId: string) => {
    try {
      await syncTrack({ trackId });
      // Обновляем список после синхронизации
      setTimeout(() => refreshTracks(), 1000);
    } catch (error) {
      // Ошибка уже обработана в хуке useManualSyncTrack
      logger.error('Sync failed', error instanceof Error ? error : new Error(String(error)), 'TracksList');
    }
  }, [syncTrack, refreshTracks]);

  const handleDelete = useCallback(async (trackId: string) => {
    try {
      await deleteTrack(trackId);
      toast({ title: "Удалено", description: "Трек успешно удалён" });
    } catch (error) {
      import('@/utils/logger').then(({ logError }) => {
        logError('Track deletion failed', error as Error, 'TracksList', {
          trackId
        });
      });
      toast({ 
        title: "Ошибка", 
        description: "Не удалось удалить трек", 
        variant: "destructive" 
      });
    }
  }, [deleteTrack, toast]);

  if (isLoading) {
    return <TrackListSkeleton count={12} />;
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <div className="p-4 mb-4 rounded-full bg-primary/10">
          <Music className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Библиотека пуста</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Создайте свой первый трек в панели слева. Он появится здесь, как только будет готов.
        </p>
      </div>
    );
  }

  return (
    <AITrackActionsContainer>
      {({ onDescribeTrack }) => (
        <div className="space-y-4" ref={containerRef}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">
              Ваши треки ({tracks.length})
            </h2>
            <ViewSwitcher view={viewMode} onViewChange={handleViewChange} />
          </div>

          {viewMode === 'grid' ? (
            tracks.length > 50 && containerDimensions.width > 0 ? (
              // Use virtualization for large lists with adaptive grid
              <VirtualizedTrackGrid
                tracks={tracks}
                columns={columns}
                gap={gap}
                onTrackPlay={onSelect || handlePlay}
                onShare={handleShare}
                onSeparateStems={onSeparateStems || (() => {})}
                onExtend={onExtend}
                onCover={onCover}
                onAddVocal={undefined}
                onCreatePersona={onCreatePersona}
                onRetry={handleRetry}
                onDelete={handleDelete}
              />
            ) : (
              // Regular adaptive grid for smaller lists
              <div 
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: `${gap}px`,
                }}
              >
                {tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track as any}
                    onClick={onSelect ? () => onSelect(track) : () => handlePlay(track)}
                    onShare={() => handleShare(track.id)}
                    onRetry={handleRetry}
                    onSync={handleSync}
                    onDelete={handleDelete}
                    onSeparateStems={onSeparateStems ? () => onSeparateStems(track.id) : undefined}
                    onExtend={onExtend ? () => onExtend(track.id) : undefined}
                    onCover={onCover ? () => onCover(track.id) : undefined}
                    onCreatePersona={onCreatePersona ? () => onCreatePersona(track.id) : undefined}
                    onDescribeTrack={() => onDescribeTrack(track.id)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {tracks.map((track) => (
                <TrackListItem
                  key={track.id}
                  track={track as any}
                  onClick={onSelect ? () => onSelect(track) : () => handlePlay(track)}
                  onShare={() => handleShare(track.id)}
                  onRetry={handleRetry}
                  onSync={handleSync}
                  onDelete={handleDelete}
                  onSeparateStems={onSeparateStems ? () => onSeparateStems(track.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AITrackActionsContainer>
  );
};

export const TracksList = memo(TracksListComponent);