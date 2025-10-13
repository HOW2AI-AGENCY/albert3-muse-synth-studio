/**
 * Retry Logic with Exponential Backoff
 * 
 * ✅ FIX: Implements automatic retry for temporary API failures (429, 503, etc.)
 * Prevents premature track failure due to transient network issues
 */

import { logger } from './logger.ts';
import { SunoApiError } from './suno.ts';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  shouldRetry: (error: unknown) => boolean;
}

export interface RetryMetrics {
  totalAttempts: number;
  totalDelay: number;
  errors: Array<{
    attempt: number;
    error: string;
    delay: number;
  }>;
}

/**
 * Execute a function with automatic retry and exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  context?: string
): Promise<{ result: T; metrics: RetryMetrics }> {
  let lastError: unknown;
  const metrics: RetryMetrics = {
    totalAttempts: 0,
    totalDelay: 0,
    errors: [],
  };

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    metrics.totalAttempts = attempt;

    try {
      logger.info(`🔄 Retry attempt ${attempt}/${config.maxAttempts}`, {
        context: context || 'retry',
        attempt,
        maxAttempts: config.maxAttempts,
      });

      const result = await fn();

      if (attempt > 1) {
        logger.info(`✅ Retry successful after ${attempt} attempts`, {
          context: context || 'retry',
          attempt,
          totalDelay: metrics.totalDelay,
        });
      }

      return { result, metrics };
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.warn(`⚠️ Attempt ${attempt} failed`, {
        context: context || 'retry',
        attempt,
        error: errorMessage,
        willRetry: attempt < config.maxAttempts && config.shouldRetry(error),
      });

      // Check if we should retry this error
      if (!config.shouldRetry(error)) {
        logger.error('❌ Error is not retryable, failing immediately', {
          context: context || 'retry',
          error: errorMessage,
          attempt,
        });
        throw error;
      }

      // Check if this was the last attempt
      if (attempt === config.maxAttempts) {
        logger.error('❌ All retry attempts exhausted', {
          context: context || 'retry',
          totalAttempts: metrics.totalAttempts,
          totalDelay: metrics.totalDelay,
          finalError: errorMessage,
        });
        throw error;
      }

      // Calculate delay with exponential backoff
      const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 200; // Add random jitter to prevent thundering herd
      const delay = Math.min(exponentialDelay + jitter, config.maxDelay);

      metrics.errors.push({
        attempt,
        error: errorMessage,
        delay,
      });
      metrics.totalDelay += delay;

      logger.info(`⏳ Waiting ${delay.toFixed(0)}ms before retry ${attempt + 1}`, {
        context: context || 'retry',
        delay,
        nextAttempt: attempt + 1,
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Predefined retry configurations for common scenarios
 */
export const retryConfigs = {
  /**
   * For Suno API calls (music generation, stems separation)
   * Retries: 429 (rate limit), 5xx (server errors)
   */
  sunoApi: {
    maxAttempts: 3,
    baseDelay: 2000, // 2 seconds
    maxDelay: 15000, // 15 seconds max
    shouldRetry: (error: unknown): boolean => {
      if (error instanceof SunoApiError) {
        // Retry on rate limits and server errors
        const statusCode = error.details.status;
        return statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
      }
      // Retry on network errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('econnrefused') ||
          message.includes('enotfound')
        );
      }
      return false;
    },
  },

  /**
   * For lightweight API calls (balance checks, simple queries)
   */
  lightweight: {
    maxAttempts: 2,
    baseDelay: 1000, // 1 second
    maxDelay: 5000, // 5 seconds max
    shouldRetry: (error: unknown): boolean => {
      if (error instanceof SunoApiError) {
        const statusCode = error.details.status;
        return statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
      }
      return false;
    },
  },

  /**
   * For critical operations that must succeed
   */
  critical: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000, // 30 seconds max
    shouldRetry: (error: unknown): boolean => {
      // More aggressive retry - retry on any non-4xx error (except 429)
      if (error instanceof SunoApiError) {
        const statusCode = error.details.status;
        return statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
      }
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('temporary')
        );
      }
      return false;
    },
  },
};

/**
 * Helper: Check if an error is retryable for Suno API
 */
export function isSunoApiRetryable(error: unknown): boolean {
  return retryConfigs.sunoApi.shouldRetry(error);
}

/**
 * Helper: Format retry metrics for logging
 */
export function formatRetryMetrics(metrics: RetryMetrics): string {
  if (metrics.totalAttempts === 1) {
    return 'succeeded on first attempt';
  }
  return `succeeded after ${metrics.totalAttempts} attempts (total delay: ${metrics.totalDelay}ms)`;
}
