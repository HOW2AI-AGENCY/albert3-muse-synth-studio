/**
 * Retry Logic with Exponential Backoff
 * Универсальная система повторных попыток для сетевых запросов
 */

import { logger } from '@/utils/logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Предустановленные конфигурации для различных типов операций
export const RETRY_CONFIGS = {
  critical: { maxAttempts: 5, initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 },
  standard: { maxAttempts: 3, initialDelayMs: 500, maxDelayMs: 10000, backoffMultiplier: 2 },
  fast: { maxAttempts: 2, initialDelayMs: 300, maxDelayMs: 3000, backoffMultiplier: 1.5 },
  aggressive: { maxAttempts: 7, initialDelayMs: 2000, maxDelayMs: 60000, backoffMultiplier: 2.5 },
} as const;

/**
 * Проверка, является ли ошибка retryable
 */
const isRetryableError = (error: Error & { status?: number }): boolean => {
  const message = error.message.toLowerCase();
  
  if (error.status && [502, 503, 504, 408, 429].includes(error.status)) {
    return true;
  }
  
  return [
    'network', 'fetch', 'timeout', 'connection',
    'econnrefused', 'enotfound'
  ].some(keyword => message.includes(keyword));
};

/**
 * Задержка с возможностью отмены
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Вычисление задержки для retry с jitter
 */
const calculateDelay = (attempt: number, config: RetryConfig): number => {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
};

/**
 * Выполнение операции с retry logic и exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config: RetryConfig = {
    maxAttempts: options.maxAttempts ?? RETRY_CONFIGS.standard.maxAttempts,
    initialDelayMs: options.initialDelayMs ?? RETRY_CONFIGS.standard.initialDelayMs,
    maxDelayMs: options.maxDelayMs ?? RETRY_CONFIGS.standard.maxDelayMs,
    backoffMultiplier: options.backoffMultiplier ?? RETRY_CONFIGS.standard.backoffMultiplier,
  };

  const shouldRetry = options.shouldRetry ?? isRetryableError;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempts`, 'retryWithBackoff');
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isLastAttempt = attempt === config.maxAttempts;
      const shouldRetryError = shouldRetry(lastError, attempt);
      
      if (isLastAttempt || !shouldRetryError) {
        logger.error(`Operation failed after ${attempt} attempts`, lastError, 'retryWithBackoff');
        throw lastError;
      }
      
      const delayMs = calculateDelay(attempt, config);
      logger.warn(`Operation failed, retrying in ${delayMs}ms (attempt ${attempt}/${config.maxAttempts})`, 'retryWithBackoff');
      
      options.onRetry?.(lastError, attempt, delayMs);
      await delay(delayMs);
    }
  }

  throw lastError || new Error('Operation failed with unknown error');
}

/**
 * Создание обёртки для функции с автоматическим retry
 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs): Promise<TResult> => retryWithBackoff(() => fn(...args), options);
}

/**
 * Retry для batch операций с контролем параллелизма
 */
export async function retryBatch<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: RetryOptions & { concurrency?: number } = {}
): Promise<R[]> {
  const concurrency = options.concurrency ?? 5;
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(item => retryWithBackoff(() => operation(item), options))
    );
    
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Circuit Breaker для предотвращения cascade failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeMs: number = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.resetTimeMs) {
        this.state = 'half-open';
        logger.info('Circuit breaker transitioning to half-open', 'CircuitBreaker');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
        logger.info('Circuit breaker closed', 'CircuitBreaker');
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      // In half-open state, any failure immediately opens the breaker
      if (this.state === 'half-open') {
        this.state = 'open';
        logger.error('Circuit breaker re-opened from half-open state', error instanceof Error ? error : undefined, 'CircuitBreaker');
      } else if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        logger.error('Circuit breaker opened', error instanceof Error ? error : undefined, 'CircuitBreaker');
      }
      throw error;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
  
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    logger.info('Circuit breaker manually reset', 'CircuitBreaker');
  }
}
