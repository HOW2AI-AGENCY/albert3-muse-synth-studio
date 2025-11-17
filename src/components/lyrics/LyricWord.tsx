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
        "inline-block px-1 py-0.5 rounded-md transition-all duration-300 cursor-pointer select-none",
        "hover:bg-primary/10 active:scale-95",
        isActive
          ? "text-primary font-bold scale-110 bg-primary/15 shadow-[0_0_16px_hsl(var(--primary)/0.4)] animate-pulse"
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
