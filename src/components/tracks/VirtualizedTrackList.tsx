/**
 * Virtualized Track List for List View
 * Uses @tanstack/react-virtual for high-performance list rendering
 */
import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrackListItem } from '@/features/tracks';
import { convertToDisplayTrack } from '@/types/track';
import type { Track } from '@/services/tracks/track.service';

interface VirtualizedTrackListProps {
  tracks: Track[];
  height: number;
  onTrackPlay: (track: any) => void;
  onShare: (trackId: string) => void;
  onSeparateStems: (trackId: string) => void;
  onRetry: (trackId: string) => void;
  onDelete: (trackId: string) => void;
  loadingTrackId?: string | null;
}

const ITEM_HEIGHT = 72; // Height of TrackListItem in pixels

export const VirtualizedTrackList = React.memo(({
  tracks,
  height,
  onTrackPlay,
  onShare,
  onSeparateStems,
  onRetry,
  onDelete,
  loadingTrackId
}: VirtualizedTrackListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleTrackPlay = useCallback((track: any) => {
    onTrackPlay(track);
  }, [onTrackPlay]);

  const handleShare = useCallback((trackId: string) => {
    onShare(trackId);
  }, [onShare]);

  const handleSeparateStems = useCallback((trackId: string) => {
    onSeparateStems(trackId);
  }, [onSeparateStems]);

  const handleRetry = useCallback((trackId: string) => {
    onRetry(trackId);
  }, [onRetry]);

  const handleDelete = useCallback((trackId: string) => {
    onDelete(trackId);
  }, [onDelete]);

  // Create virtualizer for the list
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5, // Render extra items for smoother scrolling
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="w-full overflow-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const track = tracks[virtualItem.index];
          const displayTrack = convertToDisplayTrack(track);
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
              <div className="px-2 py-1 h-full">
                <TrackListItem
                  track={displayTrack as any}
                  onShare={() => handleShare(track.id)}
                  onClick={() => handleTrackPlay(displayTrack)}
                  onSeparateStems={() => handleSeparateStems(track.id)}
                  onRetry={() => handleRetry(track.id)}
                  onDelete={() => handleDelete(track.id)}
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
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  const shouldUpdate = !(
    prevProps.tracks.length === nextProps.tracks.length &&
    prevProps.height === nextProps.height &&
    prevProps.loadingTrackId === nextProps.loadingTrackId &&
    prevProps.tracks.every((track, i) => 
      track.id === nextProps.tracks[i]?.id &&
      track.status === nextProps.tracks[i]?.status &&
      track.audio_url === nextProps.tracks[i]?.audio_url &&
      track.title === nextProps.tracks[i]?.title
    )
  );
  
  return !shouldUpdate;
});

VirtualizedTrackList.displayName = 'VirtualizedTrackList';