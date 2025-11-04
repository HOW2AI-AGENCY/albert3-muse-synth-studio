/**
 * Enhanced Sentry Integration with Context & Breadcrumbs
 * Extends base sentry.ts with additional monitoring capabilities
 */

import * as Sentry from '@sentry/react';
import { logger } from "./logger";

/**
 * Enhanced error capture with automatic context enrichment
 */
export const captureEnhancedError = (
  error: Error | unknown,
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    trackId?: string;
    provider?: 'suno' | 'mureka';
    metadata?: Record<string, unknown>;
  }
) => {
  if (!import.meta.env.PROD) {
    logger.error('[Sentry Enhanced]', error as Error, 'sentry-enhanced', context);
    return;
  }

  Sentry.withScope((scope) => {
    // Set user context
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }

    // Set tags
    if (context?.component) {
      scope.setTag('component', context.component);
    }
    if (context?.action) {
      scope.setTag('action', context.action);
    }
    if (context?.provider) {
      scope.setTag('provider', context.provider);
    }

    // Set context
    if (context?.trackId) {
      scope.setContext('track', { trackId: context.trackId });
    }
    if (context?.metadata) {
      scope.setContext('metadata', context.metadata);
    }

    // Capture exception
    Sentry.captureException(error);
  });
};

/**
 * Track user interaction breadcrumbs
 */
export const trackInteraction = (
  category: 'ui' | 'navigation' | 'generation' | 'playback',
  message: string,
  data?: Record<string, unknown>
) => {
  if (!import.meta.env.PROD) return;

  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Track generation lifecycle
 */
export const trackGenerationEvent = (
  event: 'started' | 'completed' | 'failed',
  trackId: string,
  provider: 'suno' | 'mureka',
  metadata?: {
    duration?: number;
    errorMessage?: string;
    prompt?: string;
  }
) => {
  if (!import.meta.env.PROD) return;

  // Add breadcrumb
  Sentry.addBreadcrumb({
    category: 'generation',
    message: `Generation ${event}: ${trackId}`,
    level: event === 'failed' ? 'error' : 'info',
    data: {
      trackId,
      provider,
      ...metadata,
    },
  });

  // Send metric
  if (event === 'completed' && metadata?.duration) {
    Sentry.metrics.distribution('generation.duration', metadata.duration, {
      unit: 'millisecond',
    });
  }

  // Capture error if failed
  if (event === 'failed') {
    Sentry.captureMessage(`Generation failed: ${metadata?.errorMessage || 'Unknown error'}`, {
      level: 'error',
      tags: { trackId, provider },
      contexts: {
        generation: {
          trackId,
          provider,
          prompt: metadata?.prompt,
        },
      },
    });
  }
};

/**
 * Track API requests
 */
export const trackAPIRequest = (
  endpoint: string,
  method: string,
  status: number,
  duration: number,
  error?: Error
) => {
  if (!import.meta.env.PROD) return;

  Sentry.addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: status >= 400 ? 'error' : 'info',
    data: {
      endpoint,
      method,
      status,
      duration,
    },
  });

  if (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint,
        method,
        status: status.toString(),
      },
    });
  }

  // Send performance metric
  Sentry.metrics.distribution('api.response_time', duration, {
    unit: 'millisecond',
  });
};

/**
 * Track performance metrics
 */
export const trackPerformanceMetric = (
  metric: 'bundle_load' | 'component_render' | 'query_time',
  value: number,
  _tags?: Record<string, string>
) => {
  if (!import.meta.env.PROD) return;

  Sentry.metrics.distribution(`performance.${metric}`, value, {
    unit: 'millisecond',
  });
};
