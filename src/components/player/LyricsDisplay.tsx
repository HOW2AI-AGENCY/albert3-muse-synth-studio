import React, { useEffect, useRef, useMemo, memo } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { cn } from '@/lib/utils';

interface LyricsDisplayProps {
  taskId: string;
  audioId: string;
  fallbackLyrics?: string; // ✅ P1: Добавить fallback prop
}

/**
 * ✅ Memoized to prevent unnecessary re-renders from parent
 * Only re-renders when taskId or audioId changes
 */
export const LyricsDisplay: React.FC<LyricsDisplayProps> = memo(({ taskId, audioId, fallbackLyrics }) => {
  // ✅ FIX: Улучшенная валидация taskId и audioId
  const shouldFetchTimestamped = Boolean(
    taskId && 
    typeof taskId === 'string' && 
    taskId.trim().length > 0 &&
    taskId !== 'null' &&
    taskId !== 'undefined' &&
    audioId && 
    typeof audioId === 'string' && 
    audioId.trim().length > 0
  );

  const { data: lyricsData, isLoading, isError } = useTimestampedLyrics({
    taskId: taskId || '',
    audioId: audioId || '',
    enabled: shouldFetchTimestamped
  });

  // ✅ CRITICAL FIX: Проверка валидности данных после загрузки
  const hasValidLyrics = Boolean(
    lyricsData?.alignedWords && 
    Array.isArray(lyricsData.alignedWords) && 
    lyricsData.alignedWords.length > 0
  );
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndexRef = useRef<number>(-1);

  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS

  // Memoize current word index to prevent recalculating on every render
  const currentWordIndex = useMemo(() => {
    if (!hasValidLyrics) return -1;
    return lyricsData.alignedWords.findIndex(
      (word) => currentTime >= word.startS && currentTime <= word.endS
    );
  }, [currentTime, hasValidLyrics, lyricsData]);

  // Memoize rendered words to prevent unnecessary re-renders
  const renderedWords = useMemo(() => {
    if (!hasValidLyrics) return [];
    return lyricsData.alignedWords.map((word, index) => {
      const isActive = index === currentWordIndex;
      return (
        <span
          key={index}
          data-index={index}
          className={cn(
            'inline-block text-lg sm:text-xl transition-all duration-200 px-1',
            isActive ? 'text-primary font-bold scale-110' : 'text-muted-foreground'
          )}
        >
          {word.word}{' '}
        </span>
      );
    });
  }, [hasValidLyrics, lyricsData, currentWordIndex]);

  // ✅ P1 FIX: Reset scroll position when track changes
  // This prevents the issue where switching to a new track with the same starting
  // word index (e.g., both start at index 0) would not scroll to the beginning
  useEffect(() => {
    // Reset scroll tracking ref
    lastScrolledIndexRef.current = -1;

    // Reset container scroll position to top
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [taskId, audioId]); // Reset when track changes

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

  // ✅ P0 FIX: If no taskId, show fallback immediately (don't wait for loading)
  if (!shouldFetchTimestamped) {
    if (fallbackLyrics) {
      return (
        <div className="lyrics-display max-h-60 overflow-y-auto text-center py-4">
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {fallbackLyrics}
          </p>
        </div>
      );
    }
    return <div className="text-center text-muted-foreground">Текст не найден.</div>;
  }

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Загрузка текста...</div>;
  }

  // ✅ P1 FIX: Показать fallback lyrics если timestamped недоступны
  if (isError || !hasValidLyrics) {
    if (fallbackLyrics) {
      return (
        <div className="lyrics-display max-h-60 overflow-y-auto text-center py-4 px-2">
          <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
            {fallbackLyrics}
          </p>
        </div>
      );
    }
    return <div className="text-center text-muted-foreground py-8">Текст не найден.</div>;
  }

  return (
    <div 
      ref={containerRef} 
      className="lyrics-display max-h-60 overflow-y-auto text-center py-4 px-2 
                 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
    >
      <div className="flex flex-wrap justify-center items-center gap-x-1 gap-y-2">
        {renderedWords}
      </div>
    </div>
  );
});

LyricsDisplay.displayName = 'LyricsDisplay';
