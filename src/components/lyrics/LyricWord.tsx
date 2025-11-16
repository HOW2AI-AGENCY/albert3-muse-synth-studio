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
        "inline-block transition-all duration-200 cursor-pointer hover:scale-105",
        isActive
          ? "text-primary font-semibold scale-110 drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
          : "text-foreground/70"
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
