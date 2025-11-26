/**
 * Sentry Integration for Edge Functions (Simplified)
 * 
 * Provides error tracking and performance monitoring for Deno Edge Functions.
 * Falls back gracefully if Sentry is not configured.
 */

const SENTRY_DSN = Deno.env.get('SENTRY_DSN');
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'production';

// Simple flag to check if Sentry is configured
const sentryEnabled = !!SENTRY_DSN;

if (sentryEnabled) {
  console.log(`🔍 Sentry configured for environment: ${ENVIRONMENT}`);
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
  [key: string]: unknown;
}

/**
 * Capture exception in Sentry with additional context
 * Falls back to console.error if Sentry is not configured
 */
export function captureSentryException(
  error: Error, 
  context?: SentryContext
): void {
  if (!sentryEnabled) {
    // Fallback: log to console with structured format
    console.error(JSON.stringify({
      type: 'exception',
      message: error.message,
      stack: error.stack,
      context,
      environment: ENVIRONMENT,
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  // TODO: Implement actual Sentry SDK when needed
  // For now, we log errors in a Sentry-compatible format
  console.error(JSON.stringify({
    type: 'sentry_exception',
    message: error.message,
    stack: error.stack,
    extra: context,
    tags: {
      provider: context?.provider,
      stage: context?.stage,
      environment: ENVIRONMENT,
    },
    user: context?.userId ? { id: context.userId } : undefined,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Capture message in Sentry with severity level
 * Falls back to console logging if Sentry is not configured
 */
export function captureSentryMessage(
  message: string, 
  level: 'info' | 'warning' | 'error' | 'fatal', 
  context?: SentryContext
): void {
  if (!sentryEnabled) {
    // Fallback: log to console
    const logFn = level === 'error' || level === 'fatal' ? console.error : 
                  level === 'warning' ? console.warn : 
                  console.log;
    
    logFn(JSON.stringify({
      type: 'message',
      level,
      message,
      context,
      environment: ENVIRONMENT,
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  // TODO: Implement actual Sentry SDK when needed
  console.log(JSON.stringify({
    type: 'sentry_message',
    level,
    message,
    extra: context,
    tags: {
      provider: context?.provider,
      stage: context?.stage,
      environment: ENVIRONMENT,
    },
    user: context?.userId ? { id: context.userId } : undefined,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return sentryEnabled;
}
