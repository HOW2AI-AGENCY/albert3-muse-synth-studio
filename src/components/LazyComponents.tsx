import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TracksList } from './TracksList'; // Direct import instead of lazy

// Ленивая загрузка компонентов
const DetailPanel = lazy(() =>
  import('@/features/tracks/ui/DetailPanel').then(module => ({ default: module.DetailPanel }))
);
const FullScreenPlayer = lazy(() => import('./player/FullScreenPlayer').then(module => ({ default: module.FullScreenPlayer })));

// Скелетоны загрузки
const DetailPanelSkeleton = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-6 w-40" />
    <Skeleton className="h-48 w-full rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

const FullScreenPlayerSkeleton = () => (
  <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
    <div className="text-center space-y-4">
      <Skeleton className="h-64 w-64 rounded-lg mx-auto" />
      <Skeleton className="h-6 w-48 mx-auto" />
      <Skeleton className="h-4 w-32 mx-auto" />
      <div className="flex gap-4 justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  </div>
);

// HOC для ленивой загрузки
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

// Экспорт ленивых компонентов
export const TracksListLazy = TracksList; // Direct export without lazy loading
export const DetailPanelLazy = withLazyLoading(DetailPanel, DetailPanelSkeleton);
export const LazyFullScreenPlayer = withLazyLoading(FullScreenPlayer, FullScreenPlayerSkeleton);

// Дополнительные экспорты для совместимости
export const LazyTracksList = TracksListLazy;
export const LazyDetailPanel = DetailPanelLazy;