/**
 * Lazy-loaded components for code splitting
 * Reduces initial bundle size and improves TTI
 */

import { lazy } from 'react';

// ===== PAGES =====
export const LazyGenerate = lazy(() => import('@/pages/workspace/Generate'));
export const LazyLibrary = lazy(() => import('@/pages/workspace/Library'));
export const LazyAnalytics = lazy(() => import('@/pages/workspace/Analytics'));
export const LazySettings = lazy(() => import('@/pages/workspace/Settings'));

// ===== HEAVY COMPONENTS =====
// DetailPanel не экспортируется как default, поэтому используется .then()
export const LazyDetailPanel = lazy(() => 
  import('@/features/tracks/ui/DetailPanel').then(m => ({ default: m.DetailPanel }))
);

// MusicGeneratorV2 экспортируется как именованный экспорт
export const LazyMusicGeneratorV2 = lazy(() => 
  import('@/components/MusicGeneratorV2').then(m => ({ default: m.MusicGeneratorV2 }))
);

export const LazyGlobalAudioPlayer = lazy(() => import('@/components/player/GlobalAudioPlayer'));
