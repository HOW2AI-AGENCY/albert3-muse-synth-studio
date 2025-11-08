import { logError } from './logger';

/**
 * Предзагрузка компонентов для улучшения UX
 * Вынос в отдельный .ts-файл, чтобы избежать нарушения правила
 * react-refresh/only-export-components в файлах, где также экспортируются компоненты.
 */
export const preloadComponent = (importFn: () => Promise<unknown>) => {
  // Предзагружаем компонент при наведении или других событиях
  const preload = () => {
    importFn().catch(error => {
      logError('Failed to preload component:', error instanceof Error ? error : undefined);
    });
  };

  return preload;
};

/**
 * Предзагрузчики для критических компонентов
 */
export const preloadDashboard = preloadComponent(() => import('../pages/workspace/Dashboard'));
export const preloadGenerate = preloadComponent(() => import('../pages/workspace/Generate'));
export const preloadLibrary = preloadComponent(() => import('../pages/workspace/Library'));
export const preloadProjects = preloadComponent(() => import('../pages/workspace/Projects'));
export const preloadMonitoringHub = preloadComponent(() => import('../pages/workspace/MonitoringHub'));
export const preloadStudio = preloadComponent(() => import('../pages/workspace/Studio'));
export const preloadDAW = preloadComponent(() => import('../pages/workspace/DAW'));
export const preloadFavorites = preloadComponent(() => import('../pages/workspace/Favorites'));
export const preloadSettings = preloadComponent(() => import('../pages/workspace/Settings'));
export const preloadPromptDJPage = preloadComponent(() => import('../pages/workspace/PromptDJPage'));