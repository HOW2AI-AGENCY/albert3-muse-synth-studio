/**
 * Virtualized Track List for List View
 * Uses @tanstack/react-virtual for high-performance list rendering
 */
import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrackListItem, TrackListItemProps } from '@/design-system/components/compositions/TrackListItem/TrackListItem';
import type { UnifiedTrackActionsMenuProps } from '@/components/tracks/shared/TrackActionsMenu.types';

// Omit props that are handled internally by the list item
type ActionMenuProps = Omit<UnifiedTrackActionsMenuProps, 'trackId' | 'trackStatus' | 'trackMetadata' | 'isLiked' | 'currentVersionId' | 'versionNumber' | 'isMasterVersion'>;

interface VirtualizedTrackListProps extends ActionMenuProps {
  tracks: any[];
  height?: number;
  onTrackPlay?: (track: any) => void;
  loadingTrackId?: string | null;
}

const ITEM_HEIGHT = 72; // Height of TrackListItem in pixels

export const VirtualizedTrackList = React.memo<VirtualizedTrackListProps>(({
  tracks,
  height,
  onTrackPlay,
  loadingTrackId,
  ...actionMenuProps
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
                  // Pass all action menu props to the list item
                  actionMenuProps={actionMenuProps}
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
