/**
 * Sentry Integration for Edge Functions
 * 
 * Provides error tracking and performance monitoring for Deno Edge Functions.
 * Uses Sentry Deno SDK for capturing exceptions and messages.
 */

import { 
  captureException, 
  captureMessage, 
  init,
  Severity
} from "https://esm.sh/@sentry/deno@8.42.0";

const SENTRY_DSN = Deno.env.get('SENTRY_DSN');
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'production';

// Initialize Sentry if DSN is available
if (SENTRY_DSN) {
  init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    beforeSend(event) {
      // Sanitize sensitive data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['apikey'];
      }
      return event;
    },
  });
  console.log(`🔍 Sentry initialized for environment: ${ENVIRONMENT}`);
} else {
  console.warn('⚠️ SENTRY_DSN not configured, error tracking disabled');
}

export interface SentryContext {
  userId?: string;
  trackId?: string;
  taskId?: string;
  provider?: string;
  correlationId?: string;
  stage?: string;
  [key: string]: any;
}

/**
 * Capture exception in Sentry with additional context
 */
export function captureSentryException(
  error: Error, 
  context?: SentryContext
): void {
  if (!SENTRY_DSN) return;
  
  try {
    captureException(error, {
      extra: context,
      tags: {
        provider: context?.provider,
        stage: context?.stage,
        environment: ENVIRONMENT,
      },
      user: context?.userId ? { id: context.userId } : undefined,
    });
  } catch (sentryError) {
    console.error('Failed to capture exception in Sentry:', sentryError);
  }
}

/**
 * Capture message in Sentry with severity level
 */
export function captureSentryMessage(
  message: string, 
  level: 'info' | 'warning' | 'error' | 'fatal', 
  context?: SentryContext
): void {
  if (!SENTRY_DSN) return;
  
  try {
    const sentryLevel = level === 'fatal' ? Severity.Fatal : 
                       level === 'error' ? Severity.Error :
                       level === 'warning' ? Severity.Warning :
                       Severity.Info;
    
    captureMessage(message, {
      level: sentryLevel,
      extra: context,
      tags: {
        provider: context?.provider,
        stage: context?.stage,
        environment: ENVIRONMENT,
      },
      user: context?.userId ? { id: context.userId } : undefined,
    });
  } catch (sentryError) {
    console.error('Failed to capture message in Sentry:', sentryError);
  }
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return !!SENTRY_DSN;
}
