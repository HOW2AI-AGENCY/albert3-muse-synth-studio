import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Ленивая загрузка компонентов
const MusicGenerator = lazy(() => import('./MusicGenerator').then(module => ({ default: module.MusicGenerator })));
const TracksList = lazy(() => import('./TracksList').then(module => ({ default: module.TracksList })));
const DetailPanel = lazy(() =>
  import('@/features/tracks/ui/DetailPanel').then(module => ({ default: module.DetailPanel }))
);
const FullScreenPlayer = lazy(() => import('./player/FullScreenPlayer').then(module => ({ default: module.FullScreenPlayer })));

// Скелетоны загрузки
const MusicGeneratorSkeleton = () => (
  <div className="space-y-6 p-6">
    <Skeleton className="h-8 w-48" />
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-32 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-18" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  </div>
);

const TracksListSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  </div>
);



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
export const MusicGeneratorLazy = withLazyLoading(MusicGenerator, MusicGeneratorSkeleton);
export const TracksListLazy = withLazyLoading(TracksList, TracksListSkeleton);
export const DetailPanelLazy = withLazyLoading(DetailPanel, DetailPanelSkeleton);
export const LazyFullScreenPlayer = withLazyLoading(FullScreenPlayer, FullScreenPlayerSkeleton);

// Дополнительные экспорты для совместимости
export const LazyMusicGenerator = MusicGeneratorLazy;
export const LazyTracksList = TracksListLazy;
export const LazyDetailPanel = DetailPanelLazy;