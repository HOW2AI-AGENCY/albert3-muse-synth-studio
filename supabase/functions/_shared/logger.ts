/**
 * Shared logger utility for Edge Functions
 * Provides consistent structured logging across all functions
 */

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
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...(context && { context })
    }));
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
 */
interface SentryOptions {
  transaction?: string;
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
        transaction: options?.transaction
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Request failed: ${options?.transaction || 'unknown'}`, {
        duration,
        error: error instanceof Error ? error.message : String(error),
        transaction: options?.transaction
      });
      
      // Re-throw to allow error handling by caller
      throw error;
    }
  };
};
