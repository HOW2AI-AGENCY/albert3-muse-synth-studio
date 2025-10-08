import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initServiceWorker } from './utils/serviceWorker';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { AnalyticsService } from './services/analytics.service';
import type { Metric } from 'web-vitals';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  const configuredSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1');
  const tracesSampleRate = Number.isFinite(configuredSampleRate)
    ? Math.min(Math.max(configuredSampleRate, 0), 1)
    : 0.1;

  Sentry.init({
    dsn: sentryDsn,
    integrations: [new BrowserTracing()],
    tracesSampleRate,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
  });
}

// Инициализируем Service Worker
initServiceWorker().catch(console.error);

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
  const scheduleRegistration = () => {
    registerWebVitals().catch((error) => {
      console.error('Failed to register Web Vitals collection', error);
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => scheduleRegistration());
  } else {
    window.setTimeout(scheduleRegistration, 0);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
