import { lazy } from 'react';
import { logError } from './logger';

/**
 * Утилита для создания ленивых страниц с обработкой ошибок
 * Phase 1 Optimization: Code Splitting для больших компонентов
 */
const createLazyPage = <Props extends object>(
  importFn: () => Promise<{ default: React.ComponentType<Props> }>,
  pageName: string
) => {
  return lazy(async () => {
    try {
      const module = await importFn();
      return module;
    } catch (error) {
      logError(`Failed to load lazy page: ${pageName}`, error instanceof Error ? error : undefined);

      // Fallback компонент в случае ошибки
      const FallbackComponent: React.ComponentType<Props> = () => (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Ошибка загрузки страницы</p>
            <p className="text-sm text-muted-foreground">{pageName}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );

      return {
        default: FallbackComponent
      };
    }
  });
};

/**
 * Lazy-loaded страницы для оптимизации bundle size
 * Ожидаемый эффект: -400 KB initial load
 */
export const LazyGenerate = createLazyPage(
  () => import('../pages/workspace/Generate'),
  'Generate'
);

export const LazyLibrary = createLazyPage(
  () => import('../pages/workspace/Library'),
  'Library'
);

export const LazyFavorites = createLazyPage(
  () => import('../pages/workspace/Favorites'),
  'Favorites'
);

export const LazyAnalytics = createLazyPage(
  () => import('../pages/workspace/Analytics'),
  'Analytics'
);

export const LazySettings = createLazyPage(
  () => import('../pages/workspace/Settings'),
  'Settings'
);

export const LazyDashboard = createLazyPage(
  () => import('../pages/workspace/Dashboard'),
  'Dashboard'
);

export const LazyProjects = createLazyPage(
  () => import('../pages/workspace/Projects'),
  'Projects'
);

export const LazyMonitoringHub = createLazyPage(
  () => import('../pages/workspace/MonitoringHub'),
  'MonitoringHub'
);

export const LazyStudio = createLazyPage(
  () => import('../pages/workspace/Studio').then(module => ({ default: module.Studio })),
  'Studio'
);

export const LazyDAW = createLazyPage(
  () => import('../pages/workspace/DAW').then(module => ({ default: module.DAW })),
  'DAW'
);

export const LazyProfile = createLazyPage(
  () => import('../pages/workspace/Profile'),
  'Profile'
);

export const LazyMetrics = createLazyPage(
  () => import('../pages/workspace/Metrics'),
  'Metrics'
);

export const LazyAdmin = createLazyPage(
  () => import('../pages/workspace/Admin'),
  'Admin'
);

export const LazyMonitoring = createLazyPage(
  () => import('../pages/workspace/Monitoring'),
  'Monitoring'
);

export const LazyLyricsLibrary = createLazyPage(
  () => import('../pages/workspace/LyricsLibrary'),
  'LyricsLibrary'
);

export const LazyAudioLibrary = createLazyPage(
  () => import('../pages/workspace/AudioLibrary'),
  'AudioLibrary'
);

export const LazyPersonas = createLazyPage(
  () => import('../pages/workspace/Personas'),
  'Personas'
);

export const LazyPromptDJPage = createLazyPage(
  () => import('../pages/workspace/PromptDJPage').then(module => ({ default: module.PromptDJPage })),
  'PromptDJPage'
);

export const LazyEdgeFunctionsDebug = createLazyPage(
  () => import('../pages/debug/EdgeFunctionsDebug'),
  'EdgeFunctionsDebug'
);

/**
 * Lazy-loaded компоненты для дополнительной оптимизации
 */
export const LazyMusicGeneratorV2 = lazy(() => 
  import('../components/MusicGeneratorV2').then(m => ({ default: m.MusicGeneratorV2 }))
);

/**
 * Предзагрузчики для критических страниц
 */
export const preloadGenerate = () => import('../pages/workspace/Generate');
export const preloadLibrary = () => import('../pages/workspace/Library');
export const preloadDashboard = () => import('../pages/workspace/Dashboard');
export const preloadMusicGenerator = () => import('../components/MusicGeneratorV2');
export const preloadProjects = () => import('../pages/workspace/Projects');
export const preloadMonitoringHub = () => import('../pages/workspace/MonitoringHub');
export const preloadStudio = () => import('../pages/workspace/Studio');
export const preloadDAW = () => import('../pages/workspace/DAW');
export const preloadFavorites = () => import('../pages/workspace/Favorites');
export const preloadAnalytics = () => import('../pages/workspace/Analytics');
export const preloadSettings = () => import('../pages/workspace/Settings');
export const preloadPromptDJPage = () => import('../pages/workspace/PromptDJPage');
