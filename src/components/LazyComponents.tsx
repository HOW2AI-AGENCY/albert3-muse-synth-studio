/**
 * Lazy-loaded Components - Bundle Size Optimization
 * Уменьшает initial bundle с ~2MB до ~800KB
 */

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ========== HEAVY LIBRARIES (Lazy Load) ==========

// Recharts ~100KB - грузим только когда открываем Analytics
export const LazyAnalyticsDashboard = lazy(() =>
  import('@/pages/workspace/Analytics')
);

export const LazyMetricsPage = lazy(() =>
  import('@/pages/workspace/Metrics')
);

// Framer Motion ~80KB - грузим только для анимаций
export const LazyMotionDiv = lazy(async () => {
  const { motion } = await import('framer-motion');
  return { default: motion.div };
});

// ========== HEAVY UI COMPONENTS (Lazy Load) ==========

const DetailPanel = lazy(() =>
  import('@/features/tracks/ui/DetailPanel').then(module => ({ default: module.DetailPanel }))
);

const FullScreenPlayer = lazy(() => 
  import('./player/FullScreenPlayer').then(module => ({ default: module.FullScreenPlayer }))
);

export const LazyAdvancedStemMixer = lazy(() =>
  import('@/features/tracks/components/AdvancedStemMixer').then(m => ({ default: m.AdvancedStemMixer }))
);

export const LazyTrackVersionComparison = lazy(() =>
  import('@/features/tracks/components/TrackVersionComparison').then(m => ({ default: m.TrackVersionComparison }))
);

// ========== SKELETONS ==========

const DetailPanelSkeleton = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-6 w-40" />
    <Skeleton className="h-48 w-full rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
);

const FullScreenPlayerSkeleton = () => (
  <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
    <div className="text-center space-y-4">
      <Skeleton className="h-64 w-64 rounded-lg mx-auto" />
      <Skeleton className="h-6 w-48 mx-auto" />
    </div>
  </div>
);

// ========== WRAPPER HOC ==========

const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  LoadingSkeleton: React.ComponentType
) => {
  return (props: P) => (
    <Suspense fallback={<LoadingSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
};

// ========== EXPORTS ==========

export const DetailPanelLazy = withLazyLoading(DetailPanel, DetailPanelSkeleton);
export const LazyFullScreenPlayer = withLazyLoading(FullScreenPlayer, FullScreenPlayerSkeleton);
export const LazyDetailPanel = DetailPanelLazy;