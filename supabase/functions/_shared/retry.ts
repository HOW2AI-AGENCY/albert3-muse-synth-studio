import { logger } from "./logger.ts";

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      logger.debug('Retry attempt', { attempt, maxAttempts: opts.maxAttempts });
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = error instanceof Response
        ? opts.retryableStatuses.includes(error.status)
        : true;

      if (attempt === opts.maxAttempts || !isRetryable) {
        logger.error('Max retries exceeded or non-retryable error', {
          attempt,
          maxAttempts: opts.maxAttempts,
          error: lastError.message,
        });
        throw lastError;
      }

      logger.warn('Retry attempt failed', {
        attempt,
        error: lastError.message,
        nextDelay: delay,
      });

      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError || new Error('Retry failed for unknown reason');
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init);
    
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (!response.ok && opts.retryableStatuses.includes(response.status)) {
      throw response;
    }
    
    return response;
  }, options);
}
