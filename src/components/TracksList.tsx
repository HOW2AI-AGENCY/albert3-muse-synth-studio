import { useState, memo, useCallback, useRef, useEffect, useMemo } from "react";
import { TrackCard } from "@/features/tracks/components/TrackCard";
import { TrackListItem } from "@/features/tracks/components/TrackListItem";
import { VirtualizedTrackGrid } from "./tracks/VirtualizedTrackGrid";
import { TrackListSkeleton } from "@/components/skeletons";
import type { Track } from "@/services/tracks/track.service";
import { Music } from "@/utils/iconImports";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { useManualSyncTrack } from "@/hooks/useManualSyncTrack";
import { logger } from "@/utils/logger";
import { AITrackActionsContainer } from "@/components/tracks/AITrackActionsContainer";
import { useResponsiveGrid } from "@/hooks/useResponsiveGrid";
import type { TrackOperations } from "@/hooks/tracks/useTrackOperations";

/**
 * TracksList — компонент списка треков с адаптивной сеткой и виртуализацией.
 *
 * Назначение:
 * - Отображение треков в режимах `grid` и `list` с поддержкой больших коллекций (виртуализация)
 * - Управление действиями над треком: воспроизведение, шаринг, повтор генерации, синхронизация, удаление
 * - Интеграция с глобальным аудиоплеером и контейнером действий ИИ
 *
 * Ключевые особенности производительности:
 * - Измерение размеров контейнера через `ResizeObserver` для точной виртуализации
 * - Мемоизация воспроизводимого плейлиста (`playableTracks`) и обработчиков
 * - Адаптивное вычисление количества колонок в сетке с учётом мобильной вёрстки
 *
 * Пропсы:
 * - `tracks`: список треков
 * - `isLoading`: индикатор загрузки
 * - `deleteTrack`, `refreshTracks`: операции управления
 * - коллбеки действий (`onSeparateStems`, `onExtend`, `onCover`, `onCreatePersona`, `onSelect`)
 * - `isDetailPanelOpen`: влияет на расчёт колонок сетки
 * - `trackOperations`: контейнер бизнес-операций над треком
 * - `viewMode`: режим отображения (`grid` | `list`)
 */
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
  trackOperations: TrackOperations;
  viewMode: 'grid' | 'list';
}

/**
 * Основной компонент реализации списка треков.
 * Не рендерит лишние элементы при больших объёмах данных,
 * корректно кеширует обработчики и поддерживает режимы сетка/список.
 */
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
  trackOperations,
  viewMode,
}: TracksListProps) => {
  const playTrackWithQueue = useAudioPlayerStore((state) => state.playTrackWithQueue);
  const { toast } = useToast();
  const { mutateAsync: syncTrack } = useManualSyncTrack();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

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

  // Responsive grid: получаем параметры и принудительно фиксируем 2 колонки на мобильных
  const gridParams = useResponsiveGrid(containerDimensions.width, {
    isDetailPanelOpen
  });
  const { gap } = gridParams;
  const effectiveColumns = gridParams.screenCategory === 'mobile' ? 2 : gridParams.columns;

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

    await trackOperations.retryTrackGeneration({
      track,
      onSuccess: refreshTracks,
    });
  }, [trackOperations, tracks, refreshTracks]);

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
          {viewMode === 'grid' ? (
            tracks.length > 50 && containerDimensions.width > 0 ? (
              // Use virtualization for large lists with adaptive grid
              <VirtualizedTrackGrid
                tracks={tracks}
                columns={effectiveColumns}
                gap={gap}
                onTrackPlay={onSelect || handlePlay}
                onShare={handleShare}
                onSeparateStems={onSeparateStems || (() => {})}
                onExtend={onExtend}
                onCover={onCover}
                onAddVocal={undefined}
                onCreatePersona={onCreatePersona}
                onDescribeTrack={onDescribeTrack}
                onRetry={handleRetry}
                onDelete={handleDelete}
              />
            ) : (
              // Regular adaptive grid for smaller lists
              <div 
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
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