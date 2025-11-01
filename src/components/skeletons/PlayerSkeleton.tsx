/**
 * Player Skeleton Loader
 * Phase 1, Week 4: Loading States & Skeletons
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface PlayerSkeletonProps {
  variant?: 'mini' | 'full';
  className?: string;
}

export const PlayerSkeleton = memo(({ 
  variant = 'mini',
  className 
}: PlayerSkeletonProps) => {
  if (variant === 'full') {
    return (
      <div className={cn(
        'fixed inset-0 z-50 bg-background flex flex-col animate-pulse',
        className
      )}>
        {/* Cover Art */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="aspect-square w-full max-w-md bg-muted rounded-lg" />
        </div>
        
        {/* Controls */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-3/4 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
          
          <div className="space-y-2">
            <div className="h-1 bg-muted rounded-full" />
            <div className="flex justify-between">
              <div className="h-3 bg-muted rounded w-12" />
              <div className="h-3 bg-muted rounded w-12" />
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="h-14 w-14 bg-muted rounded-full" />
            <div className="h-10 w-10 bg-muted rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 bg-card border-t p-4 animate-pulse',
      className
    )}>
      <div className="flex items-center gap-4">
        {/* Cover */}
        <div className="h-14 w-14 bg-muted rounded" />
        
        {/* Info */}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-48" />
          <div className="h-3 bg-muted rounded w-32" />
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-muted rounded-full" />
          <div className="h-10 w-10 bg-muted rounded-full" />
          <div className="h-8 w-8 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
});

PlayerSkeleton.displayName = 'PlayerSkeleton';
