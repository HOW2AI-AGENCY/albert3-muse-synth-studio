/**
 * Shared logger utility for Edge Functions
 * Provides consistent structured logging across all functions
 * Now with Sentry integration for production error tracking
 */

import { captureSentryException, captureSentryMessage, type SentryContext } from "./sentry-edge.ts";

interface LogContext {
  [key: string]: any;
}

export const logger = {
  info: (message: string, contextOrLegacyParam?: LogContext | string, legacyContext?: LogContext | any) => {
    // Поддержка обоих форматов: новый info(msg, {context}) и старый info(msg, 'func-name', {context})
    let context = contextOrLegacyParam;
    if (typeof contextOrLegacyParam === 'string' && legacyContext) {
      // Старый формат: info(message, 'function-name', { data })
      context = { ...legacyContext, _legacy_function: contextOrLegacyParam };
    } else if (typeof contextOrLegacyParam === 'string') {
      // Старый формат: info(message, 'function-name')
      context = { _legacy_function: contextOrLegacyParam };
    }
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...(context && typeof context === 'object' && { context })
    }));
  },

  error: (message: string, contextOrError?: any, legacyContext?: any, fourthParam?: any) => {
    let error: Error | undefined;
    let context: LogContext | undefined;

    // Поддержка ВСЕХ форматов:
    // 1. error(msg, { error, ...context }) - новый (2 параметра)
    // 2. error(msg, errorObj, {context}) - старый (3 параметра)
    // 3. error(msg, errorObj, 'func-name') - старый (3 параметра)
    // 4. error(msg, 'func-name') - старый (2 параметра)
    // 5. error(msg, errorObj, 'func-name', {context}) - старый (4 параметра)
    
    if (fourthParam) {
      // 4 параметра: error(msg, errorObj, 'func-name', {context})
      error = contextOrError instanceof Error ? contextOrError : new Error(String(contextOrError));
      context = typeof fourthParam === 'object' ? { ...fourthParam, _legacy_function: legacyContext } : { _legacy_function: String(legacyContext) };
    } else if (contextOrError instanceof Error) {
      error = contextOrError;
      if (legacyContext) {
        context = typeof legacyContext === 'string' 
          ? { _legacy_function: legacyContext }
          : legacyContext;
      }
    } else if (typeof contextOrError === 'string') {
      context = { _legacy_function: contextOrError };
      if (legacyContext && typeof legacyContext === 'object') {
        context = { ...context, ...legacyContext };
      }
    } else if (contextOrError && typeof contextOrError === 'object') {
      // Новый формат
      context = contextOrError;
      if (context && 'error' in context) {
        error = context.error instanceof Error ? context.error : undefined;
      }
    }

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      ...(error && { error: error.message, stack: error.stack }),
      ...(context && { context: { ...context, error: error ? "Error object logged separately" : undefined } })
    }));

    if (!message.includes('[SENTRY]') && !message.includes('sentry')) {
      try {
        captureSentryException(
          error || new Error(message),
          context as SentryContext
        );
      } catch (sentryError) {
        console.error('[SENTRY] Failed to capture exception:', sentryError);
      }
    }
  },

  warn: (message: string, contextOrLegacyParam?: LogContext | string | any, legacyContext?: LogContext | any) => {
    let context = contextOrLegacyParam;
    if (typeof contextOrLegacyParam === 'string' && legacyContext) {
      context = { ...legacyContext, _legacy_function: contextOrLegacyParam };
    } else if (typeof contextOrLegacyParam === 'string') {
      context = { _legacy_function: contextOrLegacyParam };
    }
    
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...(context && typeof context === 'object' && { context })
    }));

    if (!message.includes('[SENTRY]') && !message.includes('sentry')) {
      try {
        captureSentryMessage(
          message,
          'warning',
          context as SentryContext
        );
      } catch (sentryError) {
        console.error('[SENTRY] Failed to capture message:', sentryError);
      }
    }
  },

  debug: (message: string, context?: LogContext) => {
    console.debug(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      ...(context && { context })
    }));
  }
};

/**
 * Sentry integration wrapper for Edge Functions
 * Provides error tracking and performance monitoring
 * ✅ Now with actual Sentry integration!
 */
interface SentryOptions {
  transaction?: string;
  userId?: string;
  correlationId?: string;
}

export const withSentry = (
  handler: (req: Request) => Promise<Response>,
  options?: SentryOptions
): ((req: Request) => Promise<Response>) => {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();

    try {
      const response = await handler(req);

      const duration = Date.now() - startTime;

      // ✅ FIX: Логируем только важные запросы (> 1s или ошибки)
      if (duration > 1000 || response.status >= 400) {
        logger.info(`Request completed: ${options?.transaction || 'unknown'}`, {
          duration,
          status: response.status,
          transaction: options?.transaction,
          correlationId: options?.correlationId,
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`Request failed: ${options?.transaction || 'unknown'}`, {
        duration,
        error: error,
        errorMessage: errorMessage,
        transaction: options?.transaction,
        correlationId: options?.correlationId,
        userId: options?.userId,
      });

      // Re-throw to allow error handling by caller
      throw error;
    }
  };
};
