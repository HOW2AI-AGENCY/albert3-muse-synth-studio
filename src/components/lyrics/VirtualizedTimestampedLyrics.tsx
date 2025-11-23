/**
 * Virtualized Timestamped Lyrics Display
 * Uses @tanstack/react-virtual for optimal performance with long lyrics
 * 
 * ✅ Features:
 * - Virtualization (only renders visible lines)
 * - Auto-scroll to active line
 * - Smooth animations
 * - Mobile gestures support
 * - Keyboard shortcuts
 */

import { memo, useRef, useEffect, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TimestampedWord } from '@/hooks/useTimestampedLyrics';
import type { LyricsSettings } from './LyricsSettingsDialog';

interface VirtualizedTimestampedLyricsProps {
  lyricsData: TimestampedWord[];
  currentTime: number;
  settings: LyricsSettings;
  className?: string;
  onSeek?: (time: number) => void;
}

interface LyricLine {
  id: number;
  words: TimestampedWord[];
  startTime: number;
  endTime: number;
}

const TIMING_TOLERANCE = 0.05;

// ✅ Optimized Word Component with better animations
const VirtualizedWord = memo(({ 
  word, 
  isActive, 
  isFocused, 
  settings,
  onClick 
}: {
  word: TimestampedWord;
  isActive: boolean;
  isFocused: boolean;
  settings: LyricsSettings;
  onClick: () => void;
}) => {
  return (
    <motion.span
      onClick={onClick}
      className={cn(
        "inline-block cursor-pointer select-none px-1.5 py-1 md:px-1 md:py-0.5 rounded-md transition-all duration-200",
        "touch-manipulation min-h-[32px] md:min-h-[24px]",
        "hover:bg-primary/10 active:scale-95",
        
        // Active state - improved for mobile
        isActive && !settings.disableWordHighlight && [
          settings.highContrast
            ? "text-yellow-400 font-bold" 
            : "text-primary font-semibold",
          "bg-primary/15 shadow-[0_0_16px_hsl(var(--primary)/0.4)]",
          "scale-105 -translate-y-0.5",
          "lyrics-word-active"
        ],
        
        // Focused line
        isFocused && !isActive && "text-foreground/90 font-medium",
        
        // Default state
        !isFocused && !isActive && "text-foreground/70 hover:text-foreground/90"
      )}
      animate={{
        scale: isActive && !settings.disableWordHighlight ? [1, 1.08, 1.05] : 1,
        y: isActive && !settings.disableWordHighlight ? -3 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.3,
      }}
    >
      {word.word.replace(/[\n\r]/g, ' ').trim()}
    </motion.span>
  );
}, (prev, next) => 
  prev.isActive === next.isActive && 
  prev.isFocused === next.isFocused &&
  prev.word.startS === next.word.startS &&
  prev.settings.disableWordHighlight === next.settings.disableWordHighlight &&
  prev.settings.highContrast === next.settings.highContrast
);

VirtualizedWord.displayName = 'VirtualizedWord';

// ✅ Virtualized Line Component
const VirtualizedLine = memo(({
  line,
  currentTime,
  settings,
  isActive,
  onSeek,
}: {
  line: LyricLine;
  currentTime: number;
  settings: LyricsSettings;
  isActive: boolean;
  onSeek?: (time: number) => void;
}) => {
  const handleWordClick = useCallback((time: number) => {
    onSeek?.(Math.max(0, time - 0.1));
  }, [onSeek]);

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 md:gap-1.5 p-1 md:p-2 rounded-lg transition-all duration-200",
        "leading-normal lyrics-line",
        isActive 
          ? "lyrics-line-focused bg-primary/5 border border-primary/20 shadow-md scale-[1.01]" 
          : "lyrics-line-unfocused border border-transparent opacity-70"
      )}
    >
      {line.words.map((word, idx) => {
        const isWordActive = word.success && 
          currentTime >= (word.startS - TIMING_TOLERANCE) && 
          currentTime < (word.endS + TIMING_TOLERANCE);

        return (
          <VirtualizedWord
            key={`${word.startS}-${idx}`}
            word={word}
            isActive={isWordActive}
            isFocused={isActive}
            settings={settings}
            onClick={() => handleWordClick(word.startS)}
          />
        );
      })}
    </div>
  );
}, (prev, next) => {
  // Optimized comparison
  const prevHasActive = prev.line.words.some(w => 
    w.success && 
    prev.currentTime >= (w.startS - TIMING_TOLERANCE) && 
    prev.currentTime < (w.endS + TIMING_TOLERANCE)
  );
  
  const nextHasActive = next.line.words.some(w => 
    w.success && 
    next.currentTime >= (w.startS - TIMING_TOLERANCE) && 
    next.currentTime < (w.endS + TIMING_TOLERANCE)
  );

  return prevHasActive === nextHasActive && 
         prev.isActive === next.isActive &&
         prev.line.id === next.line.id;
});

VirtualizedLine.displayName = 'VirtualizedLine';

export const VirtualizedTimestampedLyrics = memo(({
  lyricsData,
  currentTime,
  settings,
  className,
  onSeek,
}: VirtualizedTimestampedLyricsProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // ✅ Group words into lines
  const lines = useMemo(() => {
    const grouped: LyricLine[] = [];
    let currentLine: TimestampedWord[] = [];
    let lineStartTime = 0;
    let lineId = 0;

    lyricsData.forEach((word, index) => {
      if (word.word === '\n' || word.word.includes('\n')) {
        if (currentLine.length > 0) {
          grouped.push({
            id: lineId++,
            words: currentLine,
            startTime: lineStartTime,
            endTime: currentLine[currentLine.length - 1]?.endS || lineStartTime,
          });
          currentLine = [];
        }
        lineStartTime = word.endS;
      } else {
        if (currentLine.length === 0) {
          lineStartTime = word.startS;
        }
        currentLine.push(word);
      }

      if (index === lyricsData.length - 1 && currentLine.length > 0) {
        grouped.push({
          id: lineId++,
          words: currentLine,
          startTime: lineStartTime,
          endTime: currentLine[currentLine.length - 1]?.endS || lineStartTime,
        });
      }
    });

    return grouped;
  }, [lyricsData]);

  // ✅ Virtualization setup
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 4,
  });

  // ✅ Find active line index
  const activeLineIndex = useMemo(() => {
    return lines.findIndex(line => 
      currentTime >= line.startTime && currentTime <= line.endTime
    );
  }, [lines, currentTime]);

  // ✅ Auto-scroll to active line
  useEffect(() => {
    if (activeLineIndex !== -1) {
      virtualizer.scrollToIndex(activeLineIndex, {
        align: 'center',
        behavior: 'smooth',
      });
    }
  }, [activeLineIndex, virtualizer]);

  // Font size class
  const fontSizeClass = useMemo(() => {
    switch (settings.fontSize) {
      case 'small': return 'lyrics-small';
      case 'large': return 'lyrics-large';
      default: return 'lyrics-medium';
    }
  }, [settings.fontSize]);

  const items = virtualizer.getVirtualItems();

  return (
    <div 
      ref={parentRef}
      className={cn(
        "h-full overflow-auto lyrics-container",
        fontSizeClass,
        settings.highContrast && "lyrics-high-contrast",
        className
      )}
      style={{ contain: 'strict' }}
    >
      {/* Top gradient overlay */}
      <div className="sticky top-0 left-0 right-0 h-10 gradient-lyrics-overlay-top pointer-events-none z-10" />

      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const line = lines[virtualRow.index];
          const isActive = virtualRow.index === activeLineIndex;

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
                padding: '0 var(--space-4)',
              }}
            >
              <VirtualizedLine
                line={line}
                currentTime={currentTime}
                settings={settings}
                isActive={isActive}
                onSeek={onSeek}
              />
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 left-0 right-0 h-10 gradient-lyrics-overlay-bottom pointer-events-none z-10" />
    </div>
  );
});

VirtualizedTimestampedLyrics.displayName = 'VirtualizedTimestampedLyrics';
