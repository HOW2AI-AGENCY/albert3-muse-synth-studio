/**
 * Virtualized Track Grid with Adaptive Layout
 * Uses @tanstack/react-virtual for performance optimization
 */
import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrackCard } from '@/features/tracks/components/TrackCard';
import type { DisplayTrack } from '@/types/track.types';

interface VirtualizedTrackGridProps {
  tracks: DisplayTrack[];
  columns: number;
  gap: number;
  onTrackPlay: (track: DisplayTrack) => Promise<void> | void;
  onShare: (trackId: string) => void;
  onSeparateStems: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onDescribeTrack?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
}

const CARD_HEIGHT = 340; // Approximate TrackCard height

// Memoized TrackCard wrapper to prevent re-creation of callbacks
const MemoizedTrackCard = React.memo<{
  track: DisplayTrack;
  onTrackPlay: (track: DisplayTrack) => void;
  onShare: (trackId: string) => void;
  onSeparateStems: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onDescribeTrack?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
}>(({
  track,
  onTrackPlay,
  onShare,
  onSeparateStems,
  onExtend,
  onCover,
  onAddVocal,
  onCreatePersona,
  onDescribeTrack,
  onRetry,
  onDelete,
}) => {
  const handlePlay = useCallback(() => onTrackPlay(track), [onTrackPlay, track]);
  const handleShare = useCallback(() => onShare(track.id), [onShare, track.id]);
  const handleSeparateStems = useCallback(() => onSeparateStems(track.id), [onSeparateStems, track.id]);
  const handleExtend = useCallback(() => onExtend?.(track.id), [onExtend, track.id]);
  const handleCover = useCallback(() => onCover?.(track.id), [onCover, track.id]);
  const handleAddVocal = useCallback(() => onAddVocal?.(track.id), [onAddVocal, track.id]);
  const handleCreatePersona = useCallback(() => onCreatePersona?.(track.id), [onCreatePersona, track.id]);
  const handleDescribeTrack = useCallback(() => onDescribeTrack?.(track.id), [onDescribeTrack, track.id]);

  return (
    <TrackCard
      track={track as any}
      onClick={handlePlay}
      onShare={handleShare}
      onSeparateStems={handleSeparateStems}
      onExtend={onExtend ? handleExtend : undefined}
      onCover={onCover ? handleCover : undefined}
      onAddVocal={onAddVocal ? handleAddVocal : undefined}
      onCreatePersona={onCreatePersona ? handleCreatePersona : undefined}
      onDescribeTrack={onDescribeTrack ? handleDescribeTrack : undefined}
      onRetry={onRetry}
      onDelete={onDelete}
    />
  );
});
MemoizedTrackCard.displayName = 'MemoizedTrackCard';

export const VirtualizedTrackGrid = React.memo(({
  tracks,
  columns,
  gap,
  onTrackPlay,
  onShare,
  onSeparateStems,
  onExtend,
  onCover,
  onAddVocal,
  onCreatePersona,
  onDescribeTrack,
  onRetry,
  onDelete,
}: VirtualizedTrackGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const safeTracks = Array.isArray(tracks) ? tracks : [];
  const safeColumns = Math.max(1, Number(columns) || 1);
  
  // Calculate number of rows based on current columns
  const rowCount = Math.ceil(safeTracks.length / safeColumns);
  const rowHeight = CARD_HEIGHT + gap;
  
  // Create virtualizer with key dependencies
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 3, // Increased for smoother scrolling
    // CRITICAL: Forces recalculation when columns/gap change
    measureElement:
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  return (
    <div
      ref={parentRef}
      className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
      style={{ 
        contain: 'strict'
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * safeColumns;
          const rowTracks = safeTracks.slice(startIndex, startIndex + safeColumns);
          
          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0"
              style={{
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid w-full px-4"
                style={{
                  gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))`,
                  gap: `${gap}px`,
                  height: '100%',
                }}
              >
                {rowTracks.map((track) => (
                  <div key={track.id}>
                    <MemoizedTrackCard
                      track={track}
                      onTrackPlay={onTrackPlay}
                      onShare={onShare}
                      onSeparateStems={onSeparateStems}
                      onExtend={onExtend}
                      onCover={onCover}
                      onAddVocal={onAddVocal}
                      onCreatePersona={onCreatePersona}
                      onDescribeTrack={onDescribeTrack}
                      onRetry={onRetry}
                      onDelete={onDelete}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // FIXED: Return true to PREVENT re-render, false to ALLOW re-render
  // Re-render if ANY of these conditions are FALSE (changed)
  const shouldNotUpdate = (
    prevProps.tracks.length === nextProps.tracks.length &&
    prevProps.columns === nextProps.columns &&
    prevProps.gap === nextProps.gap &&
    prevProps.tracks.every((track, i) => 
      track.id === nextProps.tracks[i]?.id &&
      track.status === nextProps.tracks[i]?.status &&
      track.audio_url === nextProps.tracks[i]?.audio_url
    )
  );
  
  return shouldNotUpdate;
});

VirtualizedTrackGrid.displayName = 'VirtualizedTrackGrid';
