import { lazy } from 'react';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

// Lazy load страниц для code splitting
export const LazyAnalytics = lazy(() => import('@/pages/workspace/Analytics'));
export const LazyFavorites = lazy(() => import('@/pages/workspace/Favorites'));
export const LazyLibrary = lazy(() => import('@/pages/workspace/Library'));
export const LazySettings = lazy(() => import('@/pages/workspace/Settings'));
export const LazyDashboard = lazy(() => import('@/pages/workspace/Dashboard'));
export const LazyGenerate = lazy(() => import('@/pages/workspace/Generate'));

// Fallback компонент для lazy loading
export const PageLoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <LoadingSkeleton />
  </div>
);

// Preload функции для критических маршрутов
export const preloadDashboard = () => import('@/pages/workspace/Dashboard');
export const preloadGenerate = () => import('@/pages/workspace/Generate');
export const preloadLibrary = () => import('@/pages/workspace/Library');
