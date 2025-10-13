import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initWebVitals } from './services/monitoring.service';
import { initServiceWorker } from './utils/serviceWorker';
import * as Sentry from '@sentry/react';
import { browserTracingIntegration } from '@sentry/react';
import { AnalyticsService } from './services/analytics.service';
import type { Metric } from 'web-vitals';
import { logger } from './utils/logger';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  const configuredSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1');
  const tracesSampleRate = Number.isFinite(configuredSampleRate)
    ? Math.min(Math.max(configuredSampleRate, 0), 1)
    : 0.1;

  Sentry.init({
    dsn: sentryDsn,
    integrations: [browserTracingIntegration()],
    tracesSampleRate,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
  });
}

// Инициализируем Service Worker
initServiceWorker().catch((error) => {
  logger.error('Failed to register service worker', error, 'ServiceWorker');
});

const registerWebVitals = async () => {
  const vitals = await import('web-vitals');
  const report = (metric: Metric) => {
    void AnalyticsService.reportWebVital(metric);
  };

  vitals.onCLS(report, { reportAllChanges: true });
  vitals.onFCP(report);
  vitals.onLCP(report);
  vitals.onTTFB?.(report);
  vitals.onINP?.(report);
};

if (typeof window !== 'undefined') {
  // Dev-only network diagnostics: detect external GET 401 to get-balance without Authorization
  if (import.meta.env.DEV && typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
      const method = (init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).method : 'GET'))?.toUpperCase();

      // Try to detect presence of Authorization header on request
      let hasAuth = false;
      try {
        const reqHeaders = init?.headers
          ? new Headers(init.headers as HeadersInit)
          : (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).headers : undefined);
        hasAuth = !!reqHeaders?.get('authorization') || !!reqHeaders?.get('Authorization');
      } catch {
        // ignore header introspection errors
      }

      const response = await originalFetch(input as any, init as any);

      try {
        if (
          method === 'GET' &&
          url.includes('/functions/v1/get-balance') &&
          response.status === 401 &&
          !hasAuth
        ) {
          // Dispatch a custom event for UI warning listeners
          window.dispatchEvent(
            new CustomEvent('external-get-balance-401', {
              detail: { url, method, status: response.status },
            })
          );
          // Also log for developers
          import('@/utils/logger').then(({ logger }) => {
            logger.warn('External GET 401 to get-balance without Authorization', 'main', {
              url,
              status: response.status,
            });
          });
        }
      } catch {
        // never break fetch
      }

      return response;
    };
  }

  const scheduleRegistration = () => {
    registerWebVitals().catch((error) => {
      logger.error('Failed to register Web Vitals collection', error, 'WebVitals');
    });
    
    // Initialize monitoring service
    initWebVitals();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => scheduleRegistration());
  } else {
    setTimeout(scheduleRegistration, 0);
  }
}

// Предзагрузка критических роутов после загрузки
const preloadCriticalRoutes = async () => {
  if (typeof window === 'undefined') return;
  
  const { preloadCriticalRoutes: preload } = await import('@/utils/bundleOptimization');
  preload();
};

createRoot(document.getElementById('root')!).render(<App />);

// Запускаем предзагрузку с задержкой
setTimeout(() => {
  preloadCriticalRoutes().catch((error) => {
    logger.error('Failed to preload critical routes', error, 'BundleOptimization');
  });
}, 1000);
