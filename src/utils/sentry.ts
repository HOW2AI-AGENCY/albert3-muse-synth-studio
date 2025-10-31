/**
 * Sentry Configuration for Production Error Tracking
 * 
 * Provides centralized error monitoring, performance tracking, and user session replay
 */

import * as Sentry from '@sentry/react';

const IS_PRODUCTION = import.meta.env.MODE === 'production';
const IS_DEVELOPMENT = import.meta.env.MODE === 'development';

// ⚠️ TODO: Add VITE_SENTRY_DSN to environment variables
// Get your DSN from: https://sentry.io/organizations/your-org/projects/
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const initSentry = () => {
  // Skip Sentry in development unless explicitly enabled
  if (IS_DEVELOPMENT && !import.meta.env.VITE_SENTRY_DEV_ENABLED) {
    console.log('[Sentry] Disabled in development mode');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured. Error tracking will be disabled.');
    console.warn('[Sentry] Add VITE_SENTRY_DSN to your environment variables.');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      
      // Environment
      environment: import.meta.env.MODE,
      
      // Release tracking (for proper sourcemap upload)
      release: `albert3-muse-synth@${import.meta.env.VITE_APP_VERSION || 'unknown'}`,
      
      // Performance Monitoring
      integrations: [
        Sentry.browserTracingIntegration({
          // Trace fetch/XHR requests
          traceFetch: true,
          traceXHR: true,
        }),
        
        // Session Replay (for debugging user sessions)
        Sentry.replayIntegration({
          // Capture only sessions with errors
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance traces sample rate
      // In production: 10% of transactions
      // In development: 100% (if enabled)
      tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
      
      // Session Replay sampling
      replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% of normal sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      // Before sending events, filter out sensitive data
      beforeSend(event) {
        // Filter out non-critical errors
        if (event.exception) {
          const errorMessage = event.exception.values?.[0]?.value || '';
          
          // Ignore network errors (they're expected in some cases)
          if (
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('NetworkError') ||
            errorMessage.includes('ERR_INTERNET_DISCONNECTED')
          ) {
            return null;
          }
          
          // Ignore expected Supabase session errors
          if (errorMessage.includes('Invalid token') && errorMessage.includes('JWT')) {
            return null;
          }
        }
        
        // Sanitize sensitive data
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        
        if (event.request?.headers) {
          delete event.request.headers.Authorization;
          delete event.request.headers.Cookie;
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        'atomicFindClose',
        
        // Random plugins/extensions
        'fb_xd_fragment',
        'bmi_SafeAddOnload',
        'EBCallBackMessageReceived',
        
        // Network errors (already filtered in beforeSend)
        'Failed to fetch',
        'NetworkError',
        'ERR_INTERNET_DISCONNECTED',
        
        // Safari specific
        'InstallTrigger',
      ],
      
      // Enable debug mode in development
      debug: IS_DEVELOPMENT,
      
      // Don't send breadcrumbs for every console.log
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }
        return breadcrumb;
      },
    });

    console.log(`[Sentry] Initialized in ${import.meta.env.MODE} mode`);
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
};

/**
 * Manually capture an exception
 */
export const captureException = (error: Error | unknown, context?: Record<string, unknown>) => {
  if (!SENTRY_DSN) return;
  
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Manually capture a message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>) => {
  if (!SENTRY_DSN) return;
  
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context for Sentry
 */
export const setUserContext = (user: { id: string; email?: string; username?: string } | null) => {
  if (!SENTRY_DSN) return;
  
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add custom breadcrumb
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, unknown>) => {
  if (!SENTRY_DSN) return;
  
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
};

/**
 * Start a performance span
 */
export const startSpan = (name: string, op: string, callback: () => void) => {
  if (!SENTRY_DSN) {
    callback();
    return;
  }
  
  return Sentry.startSpan({ name, op }, callback);
};

/**
 * Wrap component with Sentry Error Boundary
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
