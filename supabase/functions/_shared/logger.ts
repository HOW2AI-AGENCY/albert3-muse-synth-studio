export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const errorReplacer = (_key: string, value: unknown) => {
  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
      stack: value.stack,
    };
  }
  return value;
};

const log = (level: LogLevel, message: string, context?: LogContext) => {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    payload.context = context;
  }

  const text = JSON.stringify(payload, errorReplacer);

  switch (level) {
    case 'error':
      console.error(text);
      break;
    case 'warn':
      console.warn(text);
      break;
    case 'info':
      console.info(text);
      break;
    default:
      console.debug(text);
  }
};

export const logger = {
  error: (message: string, context?: LogContext) => log('error', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  debug: (message: string, context?: LogContext) => log('debug', message, context),
};
