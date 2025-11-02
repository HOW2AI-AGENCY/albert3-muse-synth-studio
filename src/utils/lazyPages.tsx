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
