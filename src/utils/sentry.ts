/**
 * Sentry Configuration for Production Error Tracking
 * 
 * Provides centralized error monitoring, performance tracking, and user session replay
 */

import * as Sentry from '@sentry/react';

const IS_PRODUCTION = import.meta.env.MODE === 'production';
const IS_DEVELOPMENT = import.meta.env.MODE === 'development';

// Sentry DSN is configured via environment variables
// VITE_SENTRY_DSN is automatically provided by Lovable Cloud
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const initSentry = () => {
  // Skip Sentry in development unless explicitly enabled
  if (IS_DEVELOPMENT && !import.meta.env.VITE_SENTRY_DEV_ENABLED) {
    return;
  }

  if (!SENTRY_DSN) {
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
          traceFetch: true,
          traceXHR: true,
          enableLongTask: true,
        }),
        
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
          maskAllInputs: true,
        }),
        
        Sentry.browserProfilingIntegration(),
        
        Sentry.httpClientIntegration({
          failedRequestStatusCodes: [[400, 599]],
          failedRequestTargets: [/.*supabase\.co.*/, /.*sunoapi\.org.*/, /.*mureka\.ai.*/],
        }),
        
        Sentry.feedbackIntegration({
          colorScheme: 'system',
          showBranding: false,
          showName: true,
          showEmail: true,
          formTitle: 'Сообщить о проблеме',
          submitButtonLabel: 'Отправить',
          cancelButtonLabel: 'Отмена',
          nameLabel: 'Имя',
          namePlaceholder: 'Ваше имя',
          emailLabel: 'Email',
          emailPlaceholder: 'your.email@example.com',
          messageLabel: 'Описание',
          messagePlaceholder: 'Что пошло не так?',
          successMessageText: 'Спасибо! Мы получили ваше сообщение.',
        }),
        
        Sentry.contextLinesIntegration(),
        Sentry.extraErrorDataIntegration({ depth: 5 }),
      ],
      
      // Performance traces sample rate
      tracesSampleRate: IS_PRODUCTION ? 0.25 : 1.0,
      profilesSampleRate: IS_PRODUCTION ? 0.25 : 1.0,
      
      // Session Replay sampling
      replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      
      // Trace propagation
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/qycfsepwguaiwcquwwbw\.supabase\.co/,
        /^https:\/\/api\.sunoapi\.org/,
        /^https:\/\/.*\.mureka\.ai/,
      ],
      
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

        // Add custom device context
        if (event.exception) {
          event.contexts = {
            ...event.contexts,
            device: {
              userAgent: navigator.userAgent,
              screenResolution: `${screen.width}x${screen.height}`,
              viewportSize: `${window.innerWidth}x${window.innerHeight}`,
              connection: (navigator as any).connection?.effectiveType || 'unknown',
              memory: (performance as any).memory 
                ? `${Math.round((performance as any).memory.usedJSHeapSize / 1048576)}MB` 
                : 'unknown',
            },
          };
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

    // Sentry initialized successfully
  } catch (error) {
    // Silently fail in production to avoid breaking the app
    if (IS_DEVELOPMENT) {
      throw error;
    }
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
