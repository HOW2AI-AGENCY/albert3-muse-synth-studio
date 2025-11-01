/**
 * Track Card Skeleton Loader
 * Phase 1, Week 4: Loading States & Skeletons
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface TrackCardSkeletonProps {
  className?: string;
}

export const TrackCardSkeleton = memo(({ className }: TrackCardSkeletonProps) => {
  return (
    <div className={cn(
      'rounded-lg border bg-card p-4 space-y-3 animate-pulse',
      className
    )}>
      {/* Cover Image */}
      <div className="aspect-square w-full bg-muted rounded-md" />
      
      {/* Title */}
      <div className="h-5 bg-muted rounded w-3/4" />
      
      {/* Metadata */}
      <div className="flex items-center gap-2">
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-4 bg-muted rounded w-12" />
      </div>
      
      {/* Tags */}
      <div className="flex gap-2">
        <div className="h-6 bg-muted rounded-full w-16" />
        <div className="h-6 bg-muted rounded-full w-20" />
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-muted rounded-full" />
          <div className="h-8 w-8 bg-muted rounded-full" />
        </div>
        <div className="h-8 w-20 bg-muted rounded" />
      </div>
    </div>
  );
});

TrackCardSkeleton.displayName = 'TrackCardSkeleton';
