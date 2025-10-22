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
  // Критичные операции (генерация музыки, создание треков)
  critical: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  // Обычные API запросы
  standard: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },
  // Быстрые операции (балансы, статусы)
  fast: {
    maxAttempts: 2,
    initialDelayMs: 300,
    maxDelayMs: 3000,
    backoffMultiplier: 1.5,
  },
  // Агрессивный retry для важных операций
  aggressive: {
    maxAttempts: 7,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2.5,
  },
} as const;

/**
 * Проверка, является ли ошибка retryable
 */
const isRetryableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  
  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return true;
  }
  
  // HTTP status codes that are retryable
  if (
    message.includes('502') || // Bad Gateway
    message.includes('503') || // Service Unavailable
    message.includes('504') || // Gateway Timeout
    message.includes('408') || // Request Timeout
    message.includes('429')    // Too Many Requests
  ) {
    return true;
  }
  
  return false;
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
const calculateDelay = (
  attempt: number,
  config: RetryConfig
): number => {
  // Exponential backoff
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Добавляем jitter (±20%) для предотвращения thundering herd
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  
  // Ограничиваем максимальной задержкой
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
      // Попытка выполнения операции
      const result = await operation();
      
      // Успех - логируем, если были повторные попытки
      if (attempt > 1) {
        logger.info(
          `Operation succeeded after ${attempt} attempts`,
          'retryWithBackoff'
        );
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Проверяем, нужно ли повторять попытку
      const isLastAttempt = attempt === config.maxAttempts;
      const shouldRetryError = shouldRetry(lastError, attempt);
      
      if (isLastAttempt || !shouldRetryError) {
        // Последняя попытка или ошибка не подлежит retry
        logger.error(
          `Operation failed after ${attempt} attempts`,
          lastError,
          'retryWithBackoff',
          {
            totalAttempts: attempt,
            finalError: lastError.message,
          }
        );
        throw lastError;
      }
      
      // Вычисляем задержку для следующей попытки
      const delayMs = calculateDelay(attempt, config);
      
      // Логируем retry
      logger.warn(
        `Operation failed, retrying in ${delayMs}ms (attempt ${attempt}/${config.maxAttempts})`,
        'retryWithBackoff',
        {
          error: lastError.message,
          attempt,
          maxAttempts: config.maxAttempts,
          delayMs,
        }
      );
      
      // Вызываем callback, если предоставлен
      if (options.onRetry) {
        options.onRetry(lastError, attempt, delayMs);
      }
      
      // Ждём перед следующей попыткой
      await delay(delayMs);
    }
  }

  // Этот код никогда не должен выполниться, но на всякий случай
  throw lastError || new Error('Operation failed with unknown error');
}

/**
 * Создание обёртки для функции с автоматическим retry
 */
export function withRetry<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return retryWithBackoff(() => fn(...args), options);
  };
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
  
  // Разбиваем на batch'и
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    // Выполняем batch с retry для каждого элемента
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
    // Проверяем состояние circuit breaker
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceFailure >= this.resetTimeMs) {
        // Переходим в half-open для проверки
        this.state = 'half-open';
        logger.info('Circuit breaker transitioning to half-open', 'CircuitBreaker');
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }
    
    try {
      const result = await operation();
      
      // Успех - сбрасываем счётчик
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
        logger.info('Circuit breaker closed - service recovered', 'CircuitBreaker');
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        logger.error(
          'Circuit breaker opened due to consecutive failures',
          error instanceof Error ? error : new Error(String(error)),
          'CircuitBreaker',
          {
            failureCount: this.failureCount,
            threshold: this.failureThreshold,
          }
        );
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
