import React, { useEffect, useRef, useMemo, memo } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { cn } from '@/lib/utils';

interface LyricsDisplayProps {
  taskId: string;
  audioId: string;
}

/**
 * ✅ Memoized to prevent unnecessary re-renders from parent
 * Only re-renders when taskId or audioId changes
 */
export const LyricsDisplay: React.FC<LyricsDisplayProps> = memo(({ taskId, audioId }) => {
  const { data: lyricsData, isLoading, isError } = useTimestampedLyrics({ taskId, audioId });
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndexRef = useRef<number>(-1);

  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS

  // Memoize current word index to prevent recalculating on every render
  const currentWordIndex = useMemo(() => {
    if (!lyricsData?.alignedWords) return -1;
    return lyricsData.alignedWords.findIndex(
      (word) => currentTime >= word.startS && currentTime <= word.endS
    );
  }, [currentTime, lyricsData]);

  // Memoize rendered words to prevent unnecessary re-renders
  const renderedWords = useMemo(() => {
    if (!lyricsData?.alignedWords) return [];
    return lyricsData.alignedWords.map((word, index) => {
      const isActive = index === currentWordIndex;
      return (
        <span
          key={index}
          className={cn(
            'text-lg transition-colors duration-200',
            isActive ? 'text-primary font-bold' : 'text-muted-foreground'
          )}
        >
          {word.word}{' '}
        </span>
      );
    });
  }, [lyricsData, currentWordIndex]);

  // Only scroll when the active word changes, not on every currentTime update
  useEffect(() => {
    if (
      currentWordIndex !== -1 &&
      currentWordIndex !== lastScrolledIndexRef.current &&
      containerRef.current
    ) {
      const activeWordElement = containerRef.current.children[currentWordIndex] as HTMLElement;
      if (activeWordElement) {
        activeWordElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        lastScrolledIndexRef.current = currentWordIndex;
      }
    }
  }, [currentWordIndex]);

  // ✅ NOW SAFE TO DO EARLY RETURNS

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Загрузка текста...</div>;
  }

  if (isError || !lyricsData || lyricsData.alignedWords.length === 0) {
    return <div className="text-center text-muted-foreground">Текст не найден.</div>;
  }

  return (
    <div ref={containerRef} className="lyrics-display max-h-60 overflow-y-auto text-center py-4">
      {renderedWords}
    </div>
  );
});

LyricsDisplay.displayName = 'LyricsDisplay';
