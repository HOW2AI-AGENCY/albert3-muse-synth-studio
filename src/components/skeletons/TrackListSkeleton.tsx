/**
 * Track List Skeleton Loader
 * Phase 1, Week 4: Loading States & Skeletons
 */

import { memo, useRef, useEffect, useState } from 'react';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { cn } from '@/lib/utils';
import { TrackCardSkeleton } from './TrackCardSkeleton';

interface TrackListSkeletonProps {
  count?: number;
  className?: string;
  isDetailPanelOpen?: boolean;
}

export const TrackListSkeleton = memo(({
  count = 12,
  className,
  isDetailPanelOpen = false
}: TrackListSkeletonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });

    observer.observe(containerRef.current);

    // Set initial width
    setContainerWidth(containerRef.current.offsetWidth);

    return () => observer.disconnect();
  }, []);

  const { gridClass, gapClass } = useResponsiveGrid(containerWidth, {
    isDetailPanelOpen
  });

  return (
    <div className={className} ref={containerRef}>
      <div className={cn("grid w-full", gridClass, gapClass)}>
        {Array.from({ length: count }).map((_, i) => (
          <TrackCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
});

TrackListSkeleton.displayName = 'TrackListSkeleton';
