// src/lib/logger.ts
export const logger = {
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  info: (...args: any[]) => {
    console.info('[INFO]', ...args);
  },
  debug: (...args: any[]) => {
    console.debug('[DEBUG]', ...args);
  },
};
