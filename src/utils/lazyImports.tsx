import { createLazyComponent } from '@/utils/lazyComponentFactory';

// Файл теперь экспортирует только ленивые компоненты.

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

// Предзагрузчики перенесены в '@/utils/lazyPreloaders'