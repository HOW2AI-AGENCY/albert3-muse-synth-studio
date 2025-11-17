/**
 * Virtualized Track Grid with Adaptive Layout
 * Uses @tanstack/react-virtual for performance optimization
 */
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrackCard } from '@/features/tracks/components/TrackCard';
import { normalizeTrack } from '@/utils/trackNormalizer';
import type { Track } from '@/services/api.service';

interface VirtualizedTrackGridProps {
  tracks: Track[];
  columns: number;
  gap: number;
  onTrackPlay: (track: any) => void;
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
  
  // Calculate number of rows based on current columns
  const rowCount = Math.ceil(tracks.length / columns);
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
          const startIndex = virtualRow.index * columns;
          const rowTracks = tracks.slice(startIndex, startIndex + columns);
          
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
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: `${gap}px`,
                  height: '100%',
                }}
              >
                {rowTracks.map((track) => (
                  <div key={track.id}>
                    <TrackCard
                      track={normalizeTrack(track)}
                      onClick={() => onTrackPlay(track)}
                      onShare={() => onShare(track.id)}
                      onSeparateStems={() => onSeparateStems(track.id)}
                      onExtend={onExtend ? () => onExtend(track.id) : undefined}
                      onCover={onCover ? () => onCover(track.id) : undefined}
                      onAddVocal={onAddVocal ? () => onAddVocal(track.id) : undefined}
                      onCreatePersona={onCreatePersona ? () => onCreatePersona(track.id) : undefined}
                      onDescribeTrack={onDescribeTrack ? () => onDescribeTrack(track.id) : undefined}
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
