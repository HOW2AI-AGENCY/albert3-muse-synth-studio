import { lazy } from 'react';

// ✅ Lazy-loaded workspace pages
export const LazyDashboard = lazy(() => import('@/pages/workspace/Dashboard'));
export const LazyGenerate = lazy(() => import('@/pages/workspace/Generate'));
export const LazyLibrary = lazy(() => import('@/pages/workspace/Library'));
export const LazyFavorites = lazy(() => import('@/pages/workspace/Favorites'));
export const LazyAnalytics = lazy(() => import('@/pages/workspace/Analytics'));
export const LazySettings = lazy(() => import('@/pages/workspace/Settings'));
export const LazyProjects = lazy(() => import('@/pages/workspace/projects/ProjectOverview').then(m => ({ default: m.ProjectOverview })));
export const LazyMonitoringHub = lazy(() => import('@/pages/workspace/MonitoringHub'));
export const LazyStudio = lazy(() => import('@/pages/workspace/Studio').then(m => ({ default: m.Studio })));
export const LazyDAW = lazy(() => import('@/pages/workspace/DAW').then(m => ({ default: m.DAW })));
export const LazyProfile = lazy(() => import('@/pages/workspace/Profile'));
export const LazyMetrics = lazy(() => import('@/pages/workspace/Metrics'));
export const LazyAdmin = lazy(() => import('@/pages/workspace/Admin'));
export const LazyMonitoring = lazy(() => import('@/pages/workspace/Monitoring'));
export const LazyLyricsLibrary = lazy(() => import('@/pages/workspace/LyricsLibrary'));
export const LazyAudioLibrary = lazy(() => import('@/pages/workspace/AudioLibrary'));
export const LazyPersonas = lazy(() => import('@/pages/workspace/Personas'));
export const LazyPromptDJPage = lazy(() => import('@/pages/workspace/PromptDJPage').then(m => ({ default: m.PromptDJPage })));
export const LazyEdgeFunctionsDebug = lazy(() => import('@/pages/debug/EdgeFunctionsDebug'));
export const LazyTrackDetail = lazy(() => import('@/pages/workspace/TrackDetail'));

