/**
 * Virtualized Track List for List View
 * Uses @tanstack/react-virtual for high-performance list rendering
 * 
 * Оптимизирован для отображения больших списков треков
 * с минимальным потреблением памяти
 * 
 * @version 2.0.0
 */
import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrackListItem } from '@/design-system/components/compositions/TrackListItem/TrackListItem';

/**
 * Props для VirtualizedTrackList
 * Все callback функции принимают trackId как параметр
 */
interface VirtualizedTrackListProps {
  tracks: any[];
  height?: number;
  onTrackPlay?: (track: any) => void;
  loadingTrackId?: string | null;
  onShare?: (trackId: string) => void | Promise<void>;
  onSeparateStems?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onUpscaleAudio?: (trackId: string) => void;
  onGenerateCover?: (trackId: string) => void;
  onRetry?: (trackId: string) => void | Promise<void>;
  onDelete?: (trackId: string) => void | Promise<void>;
  onSwitchVersion?: (trackId: string) => void;
  onDescribeTrack?: (trackId: string) => void;
  enableAITools?: boolean;
}

const ITEM_HEIGHT = 72; // Height of TrackListItem in pixels

/**
 * Virtualized track list component
 * Рендерит только видимые элементы для оптимизации производительности
 */
export const VirtualizedTrackList = React.memo<VirtualizedTrackListProps>(({
  tracks,
  height,
  onTrackPlay,
  loadingTrackId,
  onShare,
  onSeparateStems,
  onExtend,
  onCover,
  onAddVocal,
  onCreatePersona,
  onUpscaleAudio,
  onGenerateCover,
  onRetry,
  onDelete,
  onSwitchVersion,
  onDescribeTrack,
  enableAITools = true,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const handleTrackPlay = useCallback((track: any) => {
    if (onTrackPlay) {
      onTrackPlay(track);
    }
  }, [onTrackPlay]);

  const safeTracks = Array.isArray(tracks) ? tracks : [];
  const virtualizer = useVirtualizer({
    count: safeTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="w-full overflow-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
      style={{ height: height ? `${height}px` : '100%' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const track = safeTracks[virtualItem.index];
          if (!track) return null;

          const isLoading = loadingTrackId === track.id;

          return (
            <div
              key={virtualItem.key}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="px-2 py-1 h-full relative">
                <TrackListItem
                  track={track}
                  onPlay={() => handleTrackPlay(track)}
                  actionMenuProps={{
                    onShare: onShare ? () => onShare(track.id) : undefined,
                    onSeparateStems: onSeparateStems ? () => onSeparateStems(track.id) : undefined,
                    onExtend: onExtend ? () => onExtend(track.id) : undefined,
                    onCover: onCover ? () => onCover(track.id) : undefined,
                    onAddVocal: onAddVocal ? () => onAddVocal(track.id) : undefined,
                    onCreatePersona: onCreatePersona ? () => onCreatePersona(track.id) : undefined,
                    onUpscaleAudio: onUpscaleAudio ? () => onUpscaleAudio(track.id) : undefined,
                    onGenerateCover: onGenerateCover ? () => onGenerateCover(track.id) : undefined,
                    onRetry: onRetry ? () => onRetry(track.id) : undefined,
                    onDelete: onDelete ? () => onDelete(track.id) : undefined,
                    onSwitchVersion: onSwitchVersion ? () => onSwitchVersion(track.id) : undefined,
                    onDescribeTrack: onDescribeTrack ? () => onDescribeTrack(track.id) : undefined,
                    enableAITools,
                  }}
                />
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-primary">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-xs font-medium">Загрузка версий…</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedTrackList.displayName = 'VirtualizedTrackList';
