/**
 * Responsive Track Grid Component
 * 
 * @version 2.0.0
 * @refactor Jules, UI/UX Designer - Replaced inline styles with Tailwind classes from the refactored useResponsiveGrid hook.
 */

import React, { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { OptimizedTrackCard } from './OptimizedTrackCard';
import { TrackCard } from '@/features/tracks/components/TrackCard';
import type { Track } from '@/types/domain/track.types';
import { cn } from '@/lib/utils';

interface ResponsiveTrackGridProps {
  tracks: Track[];
  onPlayPause?: (trackId: string) => void;
  onLike?: (trackId: string) => void;
  onClick?: (track: Track) => void;
  onShare?: (track: Track) => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  currentTrackId?: string | null;
  likedTrackIds?: Set<string>;
  className?: string;
  optimized?: boolean;
  containerPadding?: number;
}

export const ResponsiveTrackGrid = React.memo(({
  tracks,
  onPlayPause,
  onLike,
  onClick,
  onShare,
  onRetry,
  onDelete,
  onExtend,
  onSeparateStems,
  currentTrackId,
  likedTrackIds = new Set(),
  className,
  optimized = false,
  containerPadding = 0,
}: ResponsiveTrackGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useBreakpoints();
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const width = entries[0].contentRect.width - containerPadding;
        setContainerWidth(width);
      }
    });

    if (parentRef.current) {
      observer.observe(parentRef.current);
      setContainerWidth(parentRef.current.offsetWidth - containerPadding);
    }

    return () => observer.disconnect();
  }, [containerPadding]);

  // ✅ TODO: Using refactored hook that returns Tailwind classes
  const { columns, gap, cardWidth, screenCategory, gridClass, gapClass } = useResponsiveGrid(containerWidth);

  const rowHeight = useMemo(() => {
    const imageHeight = cardWidth;
    const infoHeight = isMobile ? 80 : 100;
    return imageHeight + infoHeight + gap;
  }, [cardWidth, gap, isMobile]);

  const rowCount = Math.ceil(tracks.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 2,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const CardComponent = optimized ? OptimizedTrackCard : TrackCard;

  const handleTrackClick = useCallback((track: Track) => onClick?.(track), [onClick]);
  const handleShare = useCallback((track: Track) => onShare?.(track), [onShare]);

  return (
    <div
      ref={parentRef}
      className={cn('relative w-full h-full overflow-auto', 'scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent', className)}
      style={{ contain: 'strict' }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualItems.map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowTracks = tracks.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {/* ✅ TODO: Replaced inline grid styles with Tailwind classes */}
              <div className={cn("grid h-full", gridClass, gapClass)}>
                {rowTracks.map((track) => {
                  const isPlaying = currentTrackId === track.id;
                  const isLiked = likedTrackIds.has(track.id);

                  return (
                    <div key={track.id} style={{ minWidth: `${cardWidth}px`, maxWidth: `${cardWidth}px` }}>
                      {optimized ? (
                        <OptimizedTrackCard
                          track={track}
                          isPlaying={isPlaying}
                          isLiked={isLiked}
                          onClick={() => handleTrackClick(track)}
                          onPlayPause={onPlayPause}
                          onLike={onLike}
                        />
                      ) : (
                        <CardComponent
                          track={track}
                          onClick={() => handleTrackClick(track)}
                          onShare={() => handleShare(track)}
                          onRetry={onRetry}
                          onDelete={onDelete}
                          onExtend={onExtend}
                          onSeparateStems={onSeparateStems}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 p-2 bg-background/90 backdrop-blur-sm rounded-md text-xs border">
          <div>Screen: {screenCategory}</div>
          <div>Columns: {columns}</div>
          <div>Gap: {gap}px</div>
          <div>Card: {Math.round(cardWidth)}px</div>
          <div>Rows: {rowCount}</div>
          <div>Tracks: {tracks.length}</div>
        </div>
      )}
    </div>
  );
});

ResponsiveTrackGrid.displayName = 'ResponsiveTrackGrid';
