/**
 * Lazy loading components for better performance
 * Reduces initial bundle size and improves loading times
 */

import { lazy, Suspense, ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Music, List, Play } from "lucide-react";

// Lazy loaded components
export const LazyMusicGenerator = lazy(() => 
  import("@/components/MusicGenerator").then(module => ({
    default: module.MusicGenerator
  }))
);

export const LazyTracksList = lazy(() => 
  import("@/components/TracksList").then(module => ({
    default: module.TracksList
  }))
);

export const LazyDetailPanel = lazy(() => 
  import("@/components/workspace/DetailPanel").then(module => ({
    default: module.DetailPanel
  }))
);

export const LazyFullScreenPlayer = lazy(() => 
  import("@/components/player/FullScreenPlayer").then(module => ({
    default: module.FullScreenPlayer
  }))
);

// Loading skeletons for different components
export const MusicGeneratorSkeleton = () => (
  <Card className="h-full">
    <CardHeader className="space-y-2">
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5 text-muted-foreground" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-18" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 flex-1" />
      </div>
    </CardContent>
  </Card>
);

export const TracksListSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <List className="h-5 w-5 text-muted-foreground" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
    
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export const DetailPanelSkeleton = () => (
  <Card className="h-full">
    <CardHeader className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-32 w-full rounded-md" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-18" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-20" />
      </div>
    </CardContent>
  </Card>
);

export const FullScreenPlayerSkeleton = () => (
  <div className="fixed inset-0 bg-background z-50 flex flex-col">
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <Skeleton className="h-64 w-64 rounded-lg mb-8" />
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-6 w-32 mb-8" />
      
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-2 w-full" />
        <div className="flex items-center justify-center gap-6">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

// Higher-order component for lazy loading with custom skeleton
export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  LoadingSkeleton: ComponentType
) => {
  return (props: P) => (
    <Suspense fallback={<LoadingSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
};

// Pre-configured lazy components with skeletons
export const MusicGeneratorLazy = withLazyLoading(LazyMusicGenerator, MusicGeneratorSkeleton);
export const TracksListLazy = withLazyLoading(LazyTracksList, TracksListSkeleton);
export const DetailPanelLazy = withLazyLoading(LazyDetailPanel, DetailPanelSkeleton);
export const FullScreenPlayerLazy = withLazyLoading(LazyFullScreenPlayer, FullScreenPlayerSkeleton);