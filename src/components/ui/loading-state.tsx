/**
 * Loading State Component
 * Phase 1, Week 4: Loading States & Skeletons
 * 
 * Generic loading state with spinner and message
 */

import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
}

export const LoadingState = memo(({ 
  message = 'Загрузка...',
  className,
  size = 'md',
  centered = true
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn(
      'flex flex-col items-center gap-3',
      centered && 'justify-center min-h-[200px]',
      className
    )}>
      <Loader2 className={cn(
        'animate-spin text-primary',
        sizeClasses[size]
      )} />
      {message && (
        <p className={cn(
          'text-muted-foreground',
          textSizeClasses[size]
        )}>
          {message}
        </p>
      )}
    </div>
  );
});

LoadingState.displayName = 'LoadingState';
