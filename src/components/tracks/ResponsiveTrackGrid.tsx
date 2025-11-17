/**
 * Responsive Track Grid Component
 * 
 * Adaptive grid with:
 * - Dynamic column calculation
 * - Virtualization for 1000+ items
 * - Progressive image loading
 * - Mobile/tablet/desktop optimization
 * 
 * @version 1.0.0
 * @created 2025-11-17
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
  /** Use optimized version for better performance */
  optimized?: boolean;
  /** Container padding (affects width calculation) */
  containerPadding?: number;
}

/**
 * Responsive grid that adapts to screen size
 * 
 * Mobile: 2 columns
 * Tablet: 3-4 columns
 * Desktop: 4-5 columns
 * Wide: 5-6 columns
 * Ultrawide: 6-8 columns
 */
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

  // Measure container width
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
      // Initial measurement
      setContainerWidth(parentRef.current.offsetWidth - containerPadding);
    }

    return () => observer.disconnect();
  }, [containerPadding]);

  // Calculate grid parameters
  const { columns, gap, cardWidth, screenCategory } = useResponsiveGrid(containerWidth);

  // Calculate row height (aspect ratio 1:1.4 for card)
  const rowHeight = useMemo(() => {
    const imageHeight = cardWidth; // Square aspect ratio
    const infoHeight = isMobile ? 80 : 100; // Info section height
    return imageHeight + infoHeight + gap;
  }, [cardWidth, gap, isMobile]);

  // Calculate number of rows
  const rowCount = Math.ceil(tracks.length / columns);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 2, // Render 2 extra rows outside viewport
  });

  // Get visible items
  const virtualItems = virtualizer.getVirtualItems();

  // Track card component to use
  const CardComponent = optimized ? OptimizedTrackCard : TrackCard;

  // Memoized handlers
  const handleTrackClick = useCallback((track: Track) => {
    onClick?.(track);
  }, [onClick]);

  const handleShare = useCallback((track: Track) => {
    onShare?.(track);
  }, [onShare]);

  return (
    <div
      ref={parentRef}
      className={cn(
        'relative w-full h-full overflow-auto',
        'scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
        className
      )}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
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
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                  height: '100%',
                }}
              >
                {rowTracks.map((track) => {
                  const isPlaying = currentTrackId === track.id;
                  const isLiked = likedTrackIds.has(track.id);

                  return (
                    <div
                      key={track.id}
                      style={{
                        minWidth: `${cardWidth}px`,
                        maxWidth: `${cardWidth}px`,
                      }}
                    >
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

      {/* Debug info (dev only) */}
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
