/**
 * Track List Skeleton Loader
 * Phase 1, Week 4: Loading States & Skeletons
 */

import { memo } from 'react';
import { TrackCardSkeleton } from './TrackCardSkeleton';

interface TrackListSkeletonProps {
  count?: number;
  className?: string;
}

export const TrackListSkeleton = memo(({ 
  count = 6,
  className 
}: TrackListSkeletonProps) => {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <TrackCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
});

TrackListSkeleton.displayName = 'TrackListSkeleton';
