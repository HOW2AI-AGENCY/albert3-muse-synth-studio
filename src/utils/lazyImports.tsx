import { lazy, ComponentType } from 'react';
import { logError } from './logger';

/**
 * Утилита для создания ленивых компонентов с обработкой ошибок
 */
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string
) => {
  return lazy(async () => {
    try {
      const module = await importFn();
      return module;
    } catch (error) {
      logError(`Failed to load lazy component: ${componentName}`, error);
      
      // Возвращаем fallback компонент в случае ошибки
      const FallbackComponent = () => (
        <div className="p-4 text-center">
          <p className="text-muted-foreground">
            Ошибка загрузки компонента {componentName}
          </p>
        </div>
      );
      
      return {
        default: FallbackComponent as unknown as T
      };
    }
  });
};

/**
 * Предзагрузка компонентов для улучшения UX
 */
export const preloadComponent = (importFn: () => Promise<any>) => {
  // Предзагружаем компонент при наведении или других событиях
  const preload = () => {
    importFn().catch(error => {
      logError('Failed to preload component:', error);
    });
  };

  return preload;
};

/**
 * Ленивые импорты для основных страниц
 */
export const LazyDashboard = createLazyComponent(
  () => import('../pages/workspace/Dashboard'),
  'Dashboard'
);

export const LazyGenerate = createLazyComponent(
  () => import('../pages/workspace/Generate'),
  'Generate'
);

export const LazyLibrary = createLazyComponent(
  () => import('../pages/workspace/Library'),
  'Library'
);

export const LazyFavorites = createLazyComponent(
  () => import('../pages/workspace/Favorites'),
  'Favorites'
);

export const LazyAnalytics = createLazyComponent(
  () => import('../pages/workspace/Analytics'),
  'Analytics'
);

export const LazySettings = createLazyComponent(
  () => import('../pages/workspace/Settings'),
  'Settings'
);

/**
 * Предзагрузчики для критических компонентов
 */
export const preloadDashboard = preloadComponent(() => import('../pages/workspace/Dashboard'));
export const preloadGenerate = preloadComponent(() => import('../pages/workspace/Generate'));
export const preloadLibrary = preloadComponent(() => import('../pages/workspace/Library'));