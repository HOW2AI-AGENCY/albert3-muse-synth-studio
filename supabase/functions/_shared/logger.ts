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
  info: (message: string, context?: LogContext) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...(context && { context })
    }));
  },
  
  error: (message: string, context?: LogContext) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      ...(context && { context })
    }));
    
    // ✅ Send to Sentry
    captureSentryException(
      new Error(message), 
      context as SentryContext
    );
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...(context && { context })
    }));
    
    // ✅ Send warnings to Sentry
    captureSentryMessage(
      message, 
      'warning', 
      context as SentryContext
    );
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
      logger.info(`Request completed: ${options?.transaction || 'unknown'}`, {
        duration,
        status: response.status,
        transaction: options?.transaction,
        correlationId: options?.correlationId,
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Request failed: ${options?.transaction || 'unknown'}`, {
        duration,
        error: errorMessage,
        transaction: options?.transaction,
        correlationId: options?.correlationId,
        userId: options?.userId,
      });
      
      // ✅ Capture in Sentry
      captureSentryException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          transaction: options?.transaction,
          correlationId: options?.correlationId,
          userId: options?.userId,
          duration,
        }
      );
      
      // Re-throw to allow error handling by caller
      throw error;
    }
  };
};
