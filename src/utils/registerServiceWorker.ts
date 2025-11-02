/**
 * Service Worker Registration
 * Phase 1, Week 3: Smart Loading & Caching
 */

import { logger } from './logger';

export async function registerServiceWorker() {
  // Only register in production
  if (!import.meta.env.PROD) {
    logger.info('Service Worker disabled in development', 'registerServiceWorker');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    logger.warn('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');

    logger.info('Service Worker registered', 'registerServiceWorker', { scope: registration.scope });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          logger.info('New Service Worker available', 'registerServiceWorker');
          
          // Notify user
          if (confirm('Доступна новая версия приложения. Обновить?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('Service Worker controller changed', 'registerServiceWorker');
    });

  } catch (error) {
    logger.error('Service Worker registration failed', error as Error, 'registerServiceWorker');
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
      logger.info('Service Worker unregistered', 'registerServiceWorker');
    });
  }
}
