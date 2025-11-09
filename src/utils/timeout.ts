/**
 * Timeout Wrapper Utility
 * SEC-003: Prevents async operations from hanging indefinitely
 *
 * Usage:
 * ```typescript
 * const result = await withTimeout(
 *   fetch('https://api.example.com'),
 *   5000,
 *   'API call'
 * );
 * ```
 */

import { logger } from './logger';

/**
 * Error thrown when operation times out
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 *
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param label - Human-readable operation label for error messages
 * @returns Promise that rejects if timeout is exceeded
 *
 * @example
 * ```typescript
 * // Supabase Edge Function call with 30s timeout
 * const { data } = await withTimeout(
 *   supabase.functions.invoke('generate-suno', { body: payload }),
 *   30000,
 *   'Suno generation'
 * );
 *
 * // External API call with 10s timeout
 * const response = await withTimeout(
 *   fetch('https://api.suno.ai/v1/generate'),
 *   10000,
 *   'Suno API call'
 * );
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout | number;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new TimeoutError(
        `${label} timed out after ${timeoutMs}ms`,
        label,
        timeoutMs
      );

      logger.error(
        'Operation timeout',
        error,
        'Timeout',
        {
          operation: label,
          timeoutMs,
        }
      );

      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Default timeout values for different operation types
 */
export const TIMEOUT_DEFAULTS = {
  /** Edge Function invocations (Supabase) */
  EDGE_FUNCTION: 30000, // 30 seconds

  /** External API calls (Suno, Mureka, Replicate) */
  EXTERNAL_API: 30000, // 30 seconds

  /** Database queries (simple) */
  DB_QUERY: 5000, // 5 seconds

  /** Database queries (complex/heavy) */
  DB_QUERY_HEAVY: 10000, // 10 seconds

  /** File uploads */
  FILE_UPLOAD: 60000, // 60 seconds

  /** Webhook processing */
  WEBHOOK: 30000, // 30 seconds

  /** Realtime subscription setup */
  REALTIME_SETUP: 5000, // 5 seconds
} as const;

/**
 * Wraps an Edge Function invocation with timeout
 *
 * @example
 * ```typescript
 * const { data, error } = await withEdgeFunctionTimeout(
 *   supabase.functions.invoke('generate-suno', { body }),
 *   'generate-suno'
 * );
 * ```
 */
export function withEdgeFunctionTimeout<T>(
  promise: Promise<T>,
  functionName: string,
  customTimeout?: number
): Promise<T> {
  return withTimeout(
    promise,
    customTimeout ?? TIMEOUT_DEFAULTS.EDGE_FUNCTION,
    `Edge Function: ${functionName}`
  );
}

/**
 * Wraps an external API call with timeout
 *
 * @example
 * ```typescript
 * const response = await withExternalApiTimeout(
 *   fetch('https://api.suno.ai/generate'),
 *   'Suno AI'
 * );
 * ```
 */
export function withExternalApiTimeout<T>(
  promise: Promise<T>,
  apiName: string,
  customTimeout?: number
): Promise<T> {
  return withTimeout(
    promise,
    customTimeout ?? TIMEOUT_DEFAULTS.EXTERNAL_API,
    `External API: ${apiName}`
  );
}

/**
 * Wraps a database query with timeout
 *
 * @example
 * ```typescript
 * const { data } = await withDatabaseTimeout(
 *   supabase.from('tracks').select('*').eq('id', trackId),
 *   'fetch track',
 *   false // not a heavy query
 * );
 * ```
 */
export function withDatabaseTimeout<T>(
  promise: Promise<T>,
  queryDescription: string,
  isHeavyQuery: boolean = false,
  customTimeout?: number
): Promise<T> {
  const timeout =
    customTimeout ??
    (isHeavyQuery ? TIMEOUT_DEFAULTS.DB_QUERY_HEAVY : TIMEOUT_DEFAULTS.DB_QUERY);

  return withTimeout(promise, timeout, `Database: ${queryDescription}`);
}
