import { memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LyricLine } from './LyricLine';
import { TimestampedWord } from '@/hooks/useTimestampedLyrics';

interface VirtualizedLyricsProps {
  lines: TimestampedWord[][];
  currentTime: number;
  onWordClick: (time: number) => void;
  timingTolerance: number;
  estimateLineHeight?: number;
}

/**
 * Virtualized lyrics display for optimal performance with large texts
 * Only renders visible lines in viewport + overscan
 */
export const VirtualizedLyrics = memo(({
  lines,
  currentTime,
  onWordClick,
  timingTolerance,
  estimateLineHeight = 64, // Estimated height in pixels
}: VirtualizedLyricsProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateLineHeight,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{
        contain: 'strict', // Performance optimization
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const line = lines[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <LyricLine
                words={line}
                currentTime={currentTime}
                onWordClick={onWordClick}
                timingTolerance={timingTolerance}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if current time changed significantly or lines changed
  return (
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.lines === nextProps.lines &&
    prevProps.timingTolerance === nextProps.timingTolerance
  );
});

VirtualizedLyrics.displayName = 'VirtualizedLyrics';
