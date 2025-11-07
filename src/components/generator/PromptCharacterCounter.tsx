import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PromptCharacterCounterProps {
  currentLength: number;
  maxLength: number;
  className?: string;
}

export const PromptCharacterCounter = memo(({
  currentLength,
  maxLength,
  className,
}: PromptCharacterCounterProps) => {
  // ✅ P0 OPTIMIZATION: Memoize computed values
  const { percentage, isNearLimit, isAtLimit } = useMemo(() => {
    const pct = (currentLength / maxLength) * 100;
    return {
      percentage: pct,
      isNearLimit: pct >= 80,
      isAtLimit: pct >= 100,
    };
  }, [currentLength, maxLength]);

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <span className={cn(
        "transition-colors",
        isAtLimit ? "text-destructive font-medium" : 
        isNearLimit ? "text-warning" : 
        "text-muted-foreground"
      )}>
        {currentLength}/{maxLength}
      </span>
      {isAtLimit && (
        <span className="text-destructive text-[10px]">Достигнут лимит символов</span>
      )}
      {isNearLimit && !isAtLimit && (
        <span className="text-warning text-[10px]">Близко к лимиту</span>
      )}
    </div>
  );
});

PromptCharacterCounter.displayName = 'PromptCharacterCounter';