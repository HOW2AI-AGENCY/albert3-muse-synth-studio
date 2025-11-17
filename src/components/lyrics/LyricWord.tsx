import { memo } from 'react';
import { cn } from '@/lib/utils';

interface LyricWordProps {
  word: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Memoized word component for optimal rendering performance
 * Only re-renders when isActive state changes
 */
export const LyricWord = memo(({ word, isActive, onClick }: LyricWordProps) => {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-block px-1.5 py-1 rounded-lg transition-all duration-300 cursor-pointer select-none",
        "touch-manipulation min-h-[32px] md:min-h-[28px]", // Better touch targets on mobile
        "hover:bg-primary/10 active:scale-95",
        "text-sm md:text-base", // Smaller text on mobile
        isActive
          ? "text-primary font-bold scale-105 md:scale-110 bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.3)] md:shadow-[0_0_16px_hsl(var(--primary)/0.4)]"
          : "text-foreground/70 hover:text-foreground/90 font-medium"
      )}
    >
      {word}
    </span>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if isActive changed
  return prevProps.isActive === nextProps.isActive && prevProps.word === nextProps.word;
});

LyricWord.displayName = 'LyricWord';
