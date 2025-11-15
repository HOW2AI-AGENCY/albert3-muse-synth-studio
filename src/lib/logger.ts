// src/lib/logger.ts
interface LogContext {
  [key: string]: any;
}

export const logger = {
  error: (message: string, errorOrContext?: Error | LogContext, context?: LogContext) => {
    if (errorOrContext instanceof Error) {
      console.error('[ERROR]', message, errorOrContext, context);
    } else {
      console.error('[ERROR]', message, errorOrContext);
    }
  },
  warn: (message: string, context?: LogContext) => {
    console.warn('[WARN]', message, context);
  },
  info: (message: string, context?: LogContext) => {
    console.info('[INFO]', message, context);
  },
  debug: (message: string, context?: LogContext) => {
    console.debug('[DEBUG]', message, context);
  },
};
