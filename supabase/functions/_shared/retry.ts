/**
 * Retry Logic with Exponential Backoff
 * Reduces false failures from transient provider API errors
 */

import { logger } from "./logger.ts";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  onRetry: () => {},
};

// Check if error is retryable
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Don't retry on these errors - they won't succeed on retry
  const nonRetryablePatterns = [
    'unauthorized', // 401
    'недостаточно кредитов', // 402
    'insufficient credits',
    'bad request', // 400
    'invalid', // validation errors
    'missing authorization',
  ];
  
  return !nonRetryablePatterns.some(pattern => message.includes(pattern));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const errors: Error[] = [];
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info('Retrying operation', { attempt, maxRetries: config.maxRetries });
      }
      
      const result = await fn();
      
      if (attempt > 0) {
        logger.info('Operation succeeded after retry', { attempt, totalAttempts: attempt + 1 });
      }
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);
      
      // Check if error is retryable
      if (!isRetryableError(err)) {
        logger.warn('Non-retryable error detected, stopping retry', { 
          error: err.message,
          attempt: attempt + 1 
        });
        throw err;
      }
      
      if (attempt >= config.maxRetries) {
        logger.error('Operation failed after all retries', {
          totalAttempts: attempt + 1,
          errors: errors.map(e => e.message),
        });
        
        const aggregatedError = new Error(
          `Operation failed after ${attempt + 1} attempts. Errors: ${errors.map(e => e.message).join('; ')}`
        );
        throw aggregatedError;
      }
      
      const delayMs = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );
      
      logger.warn('Operation failed, will retry', { attempt: attempt + 1, delayMs, error: err.message });
      config.onRetry(attempt + 1, err, delayMs);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error('Retry logic error');
}
