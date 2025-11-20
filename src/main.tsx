import { createRoot } from 'react-dom/client';
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { initWebVitals } from './services/monitoring.service';
import { initServiceWorker } from './utils/serviceWorker';
import { AnalyticsService } from './services/analytics.service';
import type { Metric } from 'web-vitals';
import { logger } from './utils/logger';
import { initSentry } from './utils/sentry';
import { injectBreakpointsCSSVars } from './utils/injectBreakpointsCSSVars';

// ✅ Inject breakpoint CSS variables BEFORE rendering
if (typeof document !== 'undefined') {
  injectBreakpointsCSSVars();
}

// ✅ Initialize Sentry FIRST (with enhanced config from utils/sentry.ts)
initSentry();

// ✅ Send Web Vitals to Sentry (production only)
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  onCLS((metric) => {
    Sentry.captureMessage(`CLS: ${metric.value}`, {
      level: 'info',
      tags: { metric: 'CLS', rating: metric.rating },
    });
  });

  onFID((metric) => {
    Sentry.captureMessage(`FID: ${metric.value}`, {
      level: 'info',
      tags: { metric: 'FID', rating: metric.rating },
    });
  });

  onFCP((metric) => {
    Sentry.captureMessage(`FCP: ${metric.value}`, {
      level: 'info',
      tags: { metric: 'FCP', rating: metric.rating },
    });
  });

  onLCP((metric) => {
    Sentry.captureMessage(`LCP: ${metric.value}`, {
      level: 'info',
      tags: { metric: 'LCP', rating: metric.rating },
    });
  });

  onTTFB((metric) => {
    Sentry.captureMessage(`TTFB: ${metric.value}`, {
      level: 'info',
      tags: { metric: 'TTFB', rating: metric.rating },
    });
  });
}

// Service Worker: production only
if (import.meta.env.PROD) {
  // Register SW in production - using comprehensive serviceWorker.ts
  initServiceWorker().catch((error) => {
    logger.error('Failed to register service worker', error, 'ServiceWorker');
  });
}

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

      const response = await originalFetch(input, init);

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

createRoot(document.getElementById('root')!).render(<App />);
