/**
 * ✅ Chunk Retry Utility
 * 
 * Утилита для автоматического переподключения при ошибках загрузки chunk'ов.
 * Решает проблему "Failed to fetch dynamically imported module" после деплоя.
 */

import { logger } from './logger';

interface ChunkRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Wrapper для динамических импортов с автоматическим retry
 */
export async function retryDynamicImport<T>(
  importFn: () => Promise<T>,
  options: ChunkRetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Проверяем, является ли это ошибкой загрузки chunk'а
      const isChunkError = 
        lastError.message.includes('Failed to fetch') ||
        lastError.message.includes('dynamically imported module') ||
        lastError.message.includes('chunk');

      if (!isChunkError) {
        // Если это не ошибка chunk'а - пробрасываем сразу
        throw lastError;
      }

      logger.warn(
        `Chunk load failed (attempt ${attempt}/${maxRetries})`,
        'ChunkRetry',
        {
          error: lastError.message,
          attempt,
        }
      );

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Если это не последняя попытка - ждём и пробуем снова
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // Если все попытки провалились
  throw new Error(
    `Failed to load module after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Проверка необходимости полной перезагрузки страницы
 * Если chunk-ошибки продолжаются, возможно нужно обновить весь сайт
 */
export function checkForceReload(): void {
  const RELOAD_KEY = 'chunk_error_reload_count';
  const MAX_RELOADS = 2;
  const RELOAD_WINDOW = 60000; // 1 минута

  try {
    const stored = localStorage.getItem(RELOAD_KEY);
    const data = stored ? JSON.parse(stored) : { count: 0, timestamp: 0 };

    const now = Date.now();
    const timeSinceLastReload = now - data.timestamp;

    // Сбрасываем счётчик если прошло больше минуты
    if (timeSinceLastReload > RELOAD_WINDOW) {
      data.count = 0;
    }

    data.count++;
    data.timestamp = now;

    localStorage.setItem(RELOAD_KEY, JSON.stringify(data));

    // Если достигли лимита - перезагружаем страницу
    if (data.count >= MAX_RELOADS) {
      logger.warn(
        'Multiple chunk errors detected, forcing full reload',
        'ChunkRetry',
        { count: data.count }
      );
      
      localStorage.removeItem(RELOAD_KEY);
      window.location.reload();
    }
  } catch (error) {
    // Игнорируем ошибки localStorage
    logger.error('Failed to check force reload', error as Error, 'ChunkRetry');
  }
}

/**
 * Глобальный обработчик chunk-ошибок
 */
export function setupChunkErrorHandler(): void {
  if (typeof window === 'undefined') return;

  // Перехватываем необработанные Promise rejections (chunk errors)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (
      error instanceof Error &&
      (error.message.includes('Failed to fetch') ||
       error.message.includes('dynamically imported module'))
    ) {
      logger.error(
        'Unhandled chunk load error detected',
        error,
        'ChunkRetry',
        {
          url: window.location.href,
          userAgent: navigator.userAgent,
        }
      );

      // Проверяем необходимость перезагрузки
      checkForceReload();

      // Предотвращаем показ ошибки в консоли
      event.preventDefault();
    }
  });
}
