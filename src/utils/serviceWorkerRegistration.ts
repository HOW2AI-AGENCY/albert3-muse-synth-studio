/**
 * Service Worker Registration Utility
 * Week 3: Smart Loading & Caching
 */

import { logger } from './logger';

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      logger.info('[SW] Service Worker registered', 'ServiceWorker', { scope: registration.scope });

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            logger.info('[SW] New version available', 'ServiceWorker');
            
            // Optionally notify user about update
            if (window.confirm('Доступна новая версия приложения. Обновить сейчас?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });

      return registration;
    } catch (error) {
      logger.error('[SW] Service Worker registration failed', error as Error, 'ServiceWorker');
    }
  } else {
    logger.warn('[SW] Service Worker not supported', 'ServiceWorker');
  }
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    logger.info('[SW] Service Worker unregistered', 'ServiceWorker');
  }
};

export const clearServiceWorkerCache = async () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    logger.info('[SW] Cache clear requested', 'ServiceWorker');
  }
};
