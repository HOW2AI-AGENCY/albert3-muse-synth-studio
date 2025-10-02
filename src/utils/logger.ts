/**
 * Централизованный логгер для Albert3 Muse Synth Studio
 * Обеспечивает единообразное логирование ошибок, предупреждений и информации
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Максимальное количество логов в памяти

  /**
   * Логирование ошибки
   */
  error(message: string, error?: Error, context?: string, data?: any) {
    this.log(LogLevel.ERROR, message, context, data, error);
  }

  /**
   * Логирование предупреждения
   */
  warn(message: string, context?: string, data?: any) {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Логирование информации
   */
  info(message: string, context?: string, data?: any) {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Отладочное логирование (только в development)
   */
  debug(message: string, context?: string, data?: any) {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context, data);
    }
  }

  /**
   * Основной метод логирования
   */
  private log(level: LogLevel, message: string, context?: string, data?: any, error?: Error) {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      data,
      error
    };

    // Добавляем в массив логов
    this.logs.push(logEntry);

    // Ограничиваем размер массива
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Выводим в консоль
    this.consoleLog(logEntry);

    // В production отправляем критические ошибки на сервер
    if (!this.isDevelopment && level === LogLevel.ERROR) {
      this.sendToServer(logEntry);
    }
  }

  /**
   * Вывод в консоль с форматированием
   */
  private consoleLog(entry: LogEntry) {
    const { level, message, timestamp, context, data, error } = entry;
    const timeStr = timestamp.toISOString();
    const contextStr = context ? `[${context}]` : '';
    const fullMessage = `${timeStr} ${contextStr} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(`🔴 ${fullMessage}`, data, error);
        break;
      case LogLevel.WARN:
        console.warn(`🟡 ${fullMessage}`, data);
        break;
      case LogLevel.INFO:
        console.info(`🔵 ${fullMessage}`, data);
        break;
      case LogLevel.DEBUG:
        console.debug(`⚪ ${fullMessage}`, data);
        break;
    }
  }

  /**
   * Отправка критических ошибок на сервер (в production)
   */
  private async sendToServer(entry: LogEntry) {
    try {
      // Здесь можно интегрировать с сервисами логирования
      // например, Sentry, LogRocket, или собственный API
      
      // Пример отправки в Supabase Edge Function
      const response = await fetch('/functions/v1/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp.toISOString(),
          context: entry.context,
          data: entry.data,
          error: entry.error ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack
          } : undefined,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });

      if (!response.ok) {
        console.error('Failed to send log to server:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending log to server:', error);
    }
  }

  /**
   * Получить все логи
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Получить логи по уровню
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Очистить логи
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Экспорт логов в JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Создаем единственный экземпляр логгера
export const logger = new Logger();

// Перехватываем необработанные ошибки
window.addEventListener('error', (event) => {
  logger.error(
    'Необработанная ошибка JavaScript',
    event.error,
    'GlobalErrorHandler',
    {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  );
});

// Перехватываем необработанные Promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logger.error(
    'Необработанное отклонение Promise',
    event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
    'GlobalPromiseHandler',
    {
      reason: event.reason
    }
  );
});

// Экспортируем удобные функции для быстрого использования
export const logError = (message: string, error?: Error, context?: string, data?: any) => 
  logger.error(message, error, context, data);

export const logWarn = (message: string, context?: string, data?: any) => 
  logger.warn(message, context, data);

export const logInfo = (message: string, context?: string, data?: any) => 
  logger.info(message, context, data);

export const logDebug = (message: string, context?: string, data?: any) => 
  logger.debug(message, context, data);