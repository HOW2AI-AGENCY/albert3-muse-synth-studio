/**
 * Sentry Performance Monitoring Utilities
 * Provides helpers for tracking performance metrics and transactions
 */

import * as Sentry from '@sentry/react';
import { logger } from '@/utils/logger';

export type PerformanceTransaction = 
  | 'music.generation'
  | 'audio.load'
  | 'audio.play'
  | 'api.call'
  | 'page.load';

export interface TransactionMetadata {
  provider?: string;
  trackId?: string;
  userId?: string;
  duration?: number;
  retries?: number;
  cacheHit?: boolean;
  circuitBreakerState?: string;
  endpoint?: string;
  [key: string]: unknown;
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: PerformanceTransaction,
  metadata?: TransactionMetadata
): Sentry.Span | undefined {
  try {
    return Sentry.startSpan(
      {
        name,
        op: 'measure',
        attributes: {
          ...metadata,
          timestamp: Date.now(),
        },
      },
      (span) => span
    );
  } catch (error) {
    // ✅ FIX: Используем console напрямую, чтобы избежать циклов через logger
    console.error('[SENTRY] Failed to start transaction:', error, {
      name,
      metadata,
    });
    return undefined;
  }
}

/**
 * End a performance transaction with result
 */
export function endTransaction(
  span: Sentry.Span | undefined,
  metadata?: TransactionMetadata
): void {
  if (!span) return;

  try {
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          span.setAttribute(key, String(value));
        }
      });
    }
    span.end();
  } catch (error) {
    // ✅ FIX: Используем console напрямую
    console.error('[SENTRY] Failed to end transaction:', error);
  }
}

/**
 * Track music generation performance
 */
export async function trackGenerationPerformance<T>(
  provider: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const span = startTransaction('music.generation', { provider, ...metadata });
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    endTransaction(span, { duration, provider, status: 'ok' });

    logger.info('Music generation completed', 'SentryPerformance', {
      provider,
      duration,
      ...metadata,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    endTransaction(span, { duration, provider, status: 'error' });

    logger.error('Music generation failed', error as Error, 'SentryPerformance', {
      provider,
      duration,
      ...metadata,
    });

    throw error;
  }
}

/**
 * Track API call performance with retry information
 */
export async function trackApiCall<T>(
  endpoint: string,
  fn: () => Promise<T>,
  metadata?: {
    retries?: number;
    cacheHit?: boolean;
    circuitBreakerState?: string;
  }
): Promise<T> {
  const span = startTransaction('api.call', { ...metadata });
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    endTransaction(span, { duration, endpoint, status: 'ok', ...metadata });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    endTransaction(span, { duration, endpoint, status: 'error', ...metadata });
    throw error;
  }
}

/**
 * Track audio playback performance
 */
export function trackAudioPerformance(
  action: 'load' | 'play' | 'buffer',
  trackId: string,
  metadata?: Record<string, unknown>
): Sentry.Span | undefined {
  return startTransaction(action === 'load' ? 'audio.load' : 'audio.play', {
    trackId,
    ...metadata,
  });
}

/**
 * Record custom performance metric
 */
export function recordMetric(
  name: string,
  value: number,
  unit: 'millisecond' | 'byte' | 'percent' | 'count' = 'millisecond'
): void {
  try {
    Sentry.setMeasurement(name, value, unit);
    
    // ✅ FIX: Не логируем каждую метрику - слишком шумно
    // logger.debug удалён
  } catch (error) {
    // ✅ FIX: Используем console напрямую
    console.error('[SENTRY] Failed to record metric:', error, {
      name,
      value,
      unit,
    });
  }
}

/**
 * Report Web Vitals to Sentry
 */
export function reportWebVital(
  name: string,
  value: number,
  rating: 'good' | 'needs-improvement' | 'poor'
): void {
  recordMetric(`web-vital.${name}`, value);

  Sentry.setMeasurement(name, value, 'millisecond');
  
  if (rating === 'poor') {
    logger.warn(`Poor Web Vital: ${name}`, 'SentryPerformance', {
      value,
      rating,
    });
  }
}

/**
 * Report circuit breaker state change
 */
export function reportCircuitBreakerState(
  provider: string,
  state: 'open' | 'half-open' | 'closed',
  metadata?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category: 'circuit-breaker',
    message: `Circuit breaker ${state} for ${provider}`,
    level: state === 'open' ? 'warning' : 'info',
    data: {
      provider,
      state,
      ...metadata,
    },
  });

  recordMetric(`circuit-breaker.${provider}.${state}`, 1, 'count');
}

/**
 * Report cache performance
 */
export function reportCacheMetrics(
  hits: number,
  misses: number,
  size: number
): void {
  const hitRate = hits / (hits + misses) || 0;

  recordMetric('cache.hit-rate', hitRate * 100, 'percent');
  recordMetric('cache.size', size, 'byte');
  recordMetric('cache.hits', hits, 'count');
  recordMetric('cache.misses', misses, 'count');
}
