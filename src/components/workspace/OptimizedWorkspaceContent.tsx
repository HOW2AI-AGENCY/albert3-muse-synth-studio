/**
 * ✅ Phase 6: Optimized Workspace Content with Adaptive Components
 * Использует container queries и responsive patterns для оптимальной производительности
 */

import { Suspense, lazy } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { ResponsiveGrid } from '@/components/adaptive/ResponsiveGrid';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
const LazyTrackCard = lazy(() => 
  import('@/features/tracks/components/TrackCard').then(m => ({ default: m.TrackCard }))
);

const LazyMusicGenerator = lazy(() => 
  import('@/components/MusicGeneratorV2').then(m => ({ default: m.MusicGeneratorV2 }))
);

interface OptimizedWorkspaceContentProps {
  view: 'grid' | 'list' | 'generate';
  tracks?: any[];
  isLoading?: boolean;
}

export const OptimizedWorkspaceContent = ({
  view,
  tracks = [],
  isLoading = false,
}: OptimizedWorkspaceContentProps) => {
  const { isMobile, isTablet } = useResponsive();

  // Grid configuration based on viewport
  const getGridColumns = () => {
    if (view === 'list') return 1;
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: getGridColumns() * 2 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  );

  // Generate view
  if (view === 'generate') {
    return (
      <div className="container-normal w-full max-w-7xl mx-auto p-4">
        <Suspense fallback={<LoadingSkeleton />}>
          <LazyMusicGenerator />
        </Suspense>
      </div>
    );
  }

  // Grid/List view
  return (
    <div className="container-normal w-full p-4">
      <Suspense fallback={<LoadingSkeleton />}>
        {isLoading ? (
          <LoadingSkeleton />
        ) : view === 'list' ? (
          <div className="space-y-4">
            {tracks.map((track) => (
              <LazyTrackCard
                key={track.id}
                track={track}
              />
            ))}
          </div>
        ) : (
          <ResponsiveGrid
            minItemSize={isMobile ? 300 : isTablet ? 300 : 280}
            maxColumns={isMobile ? 1 : isTablet ? 2 : 3}
            gap={isMobile ? 'sm' : 'md'}
            className="w-full"
          >
            {tracks.map((track) => (
              <LazyTrackCard
                key={track.id}
                track={track}
              />
            ))}
          </ResponsiveGrid>
        )}
      </Suspense>
    </div>
  );
};
