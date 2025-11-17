import { memo } from 'react';
import { LyricWord } from './LyricWord';
import { TimestampedWord } from '@/hooks/useTimestampedLyrics';
import { cn } from '@/lib/utils';

interface LyricLineProps {
  words: TimestampedWord[];
  currentTime: number;
  onWordClick: (time: number) => void;
  timingTolerance: number;
}

/**
 * Memoized line component for deferred rendering
 * Only re-renders when active words change
 */
export const LyricLine = memo(({ words, currentTime, onWordClick, timingTolerance }: LyricLineProps) => {
  const hasActiveWord = words.some(w => 
    w.success && 
    currentTime >= (w.startS - timingTolerance) && 
    currentTime < (w.endS + timingTolerance)
  );

  return (
    <div 
      className={cn(
        "flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6 p-2 md:p-3 rounded-lg transition-all duration-300",
        "leading-relaxed", // Better line spacing
        hasActiveWord 
          ? "bg-primary/5 border border-primary/20 shadow-md md:shadow-lg scale-[1.01] md:scale-[1.02]" 
          : "border border-transparent"
      )}
      data-active={hasActiveWord}
    >
      {words.map((word, idx) => {
        const isActive = word.success && 
          currentTime >= (word.startS - timingTolerance) && 
          currentTime < (word.endS + timingTolerance);

        return (
          <LyricWord
            key={`${word.startS}-${idx}`}
            word={word.word}
            isActive={isActive}
            onClick={() => onWordClick(word.startS)}
          />
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if currentTime changed significantly or words changed
  const prevActiveCount = prevProps.words.filter(w => 
    w.success && 
    prevProps.currentTime >= (w.startS - prevProps.timingTolerance) && 
    prevProps.currentTime < (w.endS + prevProps.timingTolerance)
  ).length;
  
  const nextActiveCount = nextProps.words.filter(w => 
    w.success && 
    nextProps.currentTime >= (w.startS - nextProps.timingTolerance) && 
    nextProps.currentTime < (w.endS + nextProps.timingTolerance)
  ).length;

  return prevActiveCount === nextActiveCount && prevProps.words === nextProps.words;
});

LyricLine.displayName = 'LyricLine';
