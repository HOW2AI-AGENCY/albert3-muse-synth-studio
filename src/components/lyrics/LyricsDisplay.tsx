/**
 * LyricsDisplay - Modern timestamped lyrics component
 * Supports karaoke-style word-by-word highlighting with smooth animations
 */
import { memo, useEffect, useRef } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { VirtualizedLyrics } from './VirtualizedLyrics';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LyricsDisplayProps {
  sunoTaskId: string;
  sunoId: string;
  className?: string;
}

export const LyricsDisplay = memo(({ sunoTaskId, sunoId, className }: LyricsDisplayProps) => {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const queryResult = useTimestampedLyrics({
    taskId: sunoTaskId,
    audioId: sunoId,
  });

  const rawWords = queryResult.data?.alignedWords || [];
  
  // Group words into lines (split by line breaks or every 8-10 words)
  const lines = rawWords.reduce((acc: any[][], word: any, idx: number) => {
    if (idx % 8 === 0) {
      acc.push([]);
    }
    if (acc.length > 0) {
      acc[acc.length - 1].push(word);
    }
    return acc;
  }, []);

  const activeLineIndex = lines.findIndex(line =>
    currentTime >= line[0].startTime && currentTime <= line[line.length - 1].endTime
  );
  const lastActiveLineIndex = useRef(-1);

  const handleWordClick = (time: number) => {
    seekTo(time);
  };

  // ✅ TODO: Improved auto-scroll logic.
  // It now only scrolls when the active line changes, preventing scroll jitter
  // and allowing the user to manually scroll without fighting the component.
  useEffect(() => {
    if (scrollContainerRef.current && activeLineIndex !== -1 && activeLineIndex !== lastActiveLineIndex.current) {
      const activeLineElement = scrollContainerRef.current.querySelector(`[data-line-index="${activeLineIndex}"]`);
      if (activeLineElement) {
        activeLineElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        lastActiveLineIndex.current = activeLineIndex;
      }
    }
  }, [activeLineIndex]);

  if (queryResult.isLoading) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center h-full min-h-[400px] gap-4",
        className
      )}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Загрузка текста...</p>
      </div>
    );
  }

  if (queryResult.error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center h-full min-h-[400px] gap-2",
        className
      )}>
        <p className="text-sm text-destructive">Не удалось загрузить текст</p>
        <p className="text-xs text-muted-foreground">{queryResult.error.message}</p>
      </div>
    );
  }

  if (!lines || lines.length === 0) {
    return (
      <div className={cn(
        "flex items-center justify-center h-full min-h-[400px]",
        className
      )}>
        <p className="text-sm text-muted-foreground">Текст песни недоступен</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className={cn(
        "relative h-full overflow-y-auto overflow-x-hidden",
        "scroll-snap-y-mandatory", // ✅ Added for smooth scroll snapping
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/40",
        // ✅ TODO: Reduced padding on mobile for a more compact view
        "px-3 py-4 md:px-6 md:py-10",
        "bg-gradient-to-b from-background/50 via-transparent to-background/50",
        className
      )}
    >
      {/* Gradient overlays for smooth fade - smaller on mobile */}
      {/* ✅ TODO: Reduced gradient height on mobile */}
      <div className="sticky top-0 left-0 right-0 h-8 md:h-12 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
      
      <VirtualizedLyrics
        lines={lines}
        currentTime={currentTime}
        onWordClick={handleWordClick}
        timingTolerance={0.2}
      />

      <div className="sticky bottom-0 left-0 right-0 h-12 md:h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
});

LyricsDisplay.displayName = 'LyricsDisplay';
