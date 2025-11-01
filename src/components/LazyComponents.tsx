/**
 * Lazy-loaded Heavy Components
 * Week 2, Phase 2.1: Bundle Optimization Implementation
 * 
 * This file centralizes lazy loading for heavy components to reduce initial bundle size.
 * Components are loaded on-demand when needed, improving TTI and FCP metrics.
 */

import { lazy } from 'react';

/**
 * MusicGeneratorV2 - Heavy music generation component (~150 KB)
 * Used in: Generate page
 */
export const LazyMusicGeneratorV2 = lazy(() => 
  import('./MusicGeneratorV2').then(m => ({ default: m.MusicGeneratorV2 }))
);

/**
 * LyricsWorkspace - Heavy lyrics editor (~80 KB)
 * Used in: Generate page (custom mode), Lyrics edit dialog
 */
export const LazyLyricsWorkspace = lazy(() => 
  import('./lyrics/workspace/LyricsWorkspace').then(m => ({ default: m.LyricsWorkspace }))
);

/**
 * GlobalAudioPlayer - Audio player with complex controls (~60 KB)
 * Loaded early but kept separate for code splitting
 */
export const LazyGlobalAudioPlayer = lazy(() => 
  import('./player/GlobalAudioPlayer')
);

/**
 * DetailPanel - Track detail view (~40 KB)
 * Already lazy-loaded in Generate.tsx, exported for consistency
 */
export const LazyDetailPanel = lazy(() => 
  import('@/features/tracks/ui/DetailPanel').then(m => ({ default: m.DetailPanel }))
);

/**
 * Preload functions for critical components
 * Use these on hover/focus events to improve perceived performance
 */
export const preloadMusicGenerator = () => import('./MusicGeneratorV2');
export const preloadLyricsWorkspace = () => import('./lyrics/workspace/LyricsWorkspace');
export const preloadDetailPanel = () => import('@/features/tracks/ui/DetailPanel');
