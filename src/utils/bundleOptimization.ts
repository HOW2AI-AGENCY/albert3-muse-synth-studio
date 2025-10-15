/**
 * Bundle Size Optimization Utilities
 * Предзагрузка и динамический импорт для улучшения производительности
 */

// ========== PRELOADING STRATEGIES ==========

/**
 * Предзагрузка роута при наведении на ссылку
 */
import { logger } from './logger';

export const preloadOnHover = (importFn: () => Promise<unknown>) => {
  return () => {
    importFn().catch(err => {
      logger.warn('Failed to preload component', 'bundleOptimization', { error: err });
    });
  };
};

/**
 * Предзагрузка роута при idle
 */
export const preloadOnIdle = (importFn: () => Promise<unknown>) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn().catch(err => {
        logger.warn('Failed to preload component on idle', 'bundleOptimization', { error: err });
      });
    });
  } else {
    // Fallback для браузеров без requestIdleCallback
    setTimeout(() => {
      importFn().catch(err => {
        logger.warn('Failed to preload component', 'bundleOptimization', { error: err });
      });
    }, 1000);
  }
};

/**
 * Предзагрузка критических роутов после загрузки страницы
 */
export const preloadCriticalRoutes = () => {
  if (typeof window === 'undefined') return;

  preloadOnIdle(() => import('../pages/workspace/Library'));
  preloadOnIdle(() => import('../pages/workspace/Favorites'));
  
  // Предзагружаем тяжёлые компоненты с задержкой
  setTimeout(() => {
    preloadOnIdle(() => import('../features/tracks/ui/DetailPanel'));
  }, 2000);
};

// ========== TREE-SHAKING HELPERS ==========

/**
 * Оптимизированный импорт из date-fns (tree-shakeable)
 */
export { formatDistanceToNow, format, parseISO } from 'date-fns';

/**
 * Оптимизированный импорт из framer-motion
 */
export { motion, AnimatePresence } from 'framer-motion';

// ========== DYNAMIC IMPORTS ==========

/**
 * Lazy import для тяжёлых библиотек
 */
export const loadRecharts = () => import('recharts');
export const loadFramerMotion = () => import('framer-motion');
