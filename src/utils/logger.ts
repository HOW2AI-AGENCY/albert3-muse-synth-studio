import * as Sentry from "@sentry/react";

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

const enableSentryInDevelopment = import.meta.env?.VITE_SENTRY_ENABLE_IN_DEV === "true";

const hasSentryClient = (): boolean => {
  try {
    return Boolean(Sentry.getClient());
  } catch (_error) {
    return false;
  }
};

const breadcrumbLevelMap: Record<LogLevel, Sentry.SeverityLevel> = {
  [LogLevel.ERROR]: "error",
  [LogLevel.WARN]: "warning",
  [LogLevel.INFO]: "info",
  [LogLevel.DEBUG]: "debug",
};

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isBrowser = typeof window !== 'undefined';
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Максимальное количество логов в памяти

  /**
   * Логирование ошибки
   */
  error(message: string, error?: Error, context?: string, data?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, context, data, error);
  }

  /**
   * Логирование предупреждения
   */
  warn(message: string, context?: string, data?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Логирование информации
   */
  info(message: string, context?: string, data?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Отладочное логирование (только в development)
   */
  debug(message: string, context?: string, data?: Record<string, unknown>) {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context, data);
    }
  }

  /**
   * Основной метод логирования
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, unknown>,
    error?: Error
  ) {
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

    // Добавляем хлебные крошки Sentry для более полного контекста
    this.addSentryBreadcrumb(logEntry);

    // Отправляем в Sentry при необходимости
    this.captureWithSentry(logEntry);

    // В production отправляем критические ошибки на сервер
    if (!this.isDevelopment && this.isBrowser && level === LogLevel.ERROR) {
      void this.sendToServer(logEntry);
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

  private captureWithSentry(entry: LogEntry) {
    if (!this.isBrowser) {
      return;
    }

    if (entry.level !== LogLevel.ERROR) {
      return;
    }

    if (this.isDevelopment && !enableSentryInDevelopment) {
      return;
    }

    if (!hasSentryClient()) {
      return;
    }
    const maskedData = this.maskSensitiveData(entry.data);

    Sentry.captureException(entry.error ?? new Error(entry.message), (scope) => {
      scope.setLevel("error");
      scope.setTag("logger.context", entry.context ?? "global");
      scope.setContext("logger", {
        message: entry.message,
        timestamp: entry.timestamp.toISOString(),
        data: maskedData,
      });
      if (maskedData) {
        scope.setExtras(maskedData);
      }
      return scope;
    });
  }

  private addSentryBreadcrumb(entry: LogEntry) {
    if (!this.isBrowser) {
      return;
    }

    if (this.isDevelopment && !enableSentryInDevelopment) {
      return;
    }

    if (!hasSentryClient()) {
      return;
    }

    const maskedData = this.maskSensitiveData(entry.data);

    Sentry.addBreadcrumb({
      level: breadcrumbLevelMap[entry.level] ?? "info",
      category: entry.context ?? "logger",
      message: entry.message,
      data: maskedData,
      timestamp: Math.floor(entry.timestamp.getTime() / 1000),
    });
  }

  /**
   * Отправка критических ошибок на сервер (в production)
   */
  private async sendToServer(entry: LogEntry) {
    if (!this.isBrowser) {
      return;
    }

    try {
      // Здесь можно интегрировать с сервисами логирования
      // например, Sentry, LogRocket, или собственный API

      // Пример отправки в Supabase Edge Function
      const maskedData = this.maskSensitiveData(entry.data);

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
          data: maskedData,
          error: entry.error ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack
          } : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined
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
   * Маскируем чувствительные данные перед отправкой
   */
  private maskSensitiveData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
    return maskObject(data);
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

/**
 * Masks a string value for logging.
 * @param value The string to mask.
 * @returns A masked version of the string.
 */
const maskString = (value: string): string => {
  // ✅ SECURITY: Проверяем на паттерны API keys/tokens
  const sensitivePatterns = [
    /sk-[\w-]+/gi,           // OpenAI keys
    /mureka_[\w-]+/gi,       // Mureka keys
    /suno_[\w-]+/gi,         // Suno keys
    /bearer\s+[\w-]+/gi,     // Bearer tokens
    /^ey[\w-]+\.[\w-]+\.[\w-]+$/gi, // JWT tokens
  ];
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(value)) {
      return '[REDACTED]';
    }
  }
  
  if (value.length <= 6) {
    return `${value[0] ?? "*"}***${value[value.length - 1] ?? "*"}`;
  }
  const start = value.slice(0, 3);
  const end = value.slice(-2);
  return `${start}***${end}`;
};

/**
 * Recursively masks sensitive data in an object.
 * @param data The object to mask.
 * @returns A new object with sensitive data masked.
 */
export const maskObject = (data?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!data) {
    return undefined;
  }

  // ✅ SECURITY: Расширенный список чувствительных ключей
  const sensitiveKeywords = [
    "token", "key", "secret", "password", "authorization", "cookie", "credential",
    "api_key", "apikey", "api-key", "auth", "bearer", "jwt",
    "lovable_api_key", "suno_api_key", "mureka_api_key", "openai_api_key"
  ];

  const maskValue = (value: unknown, keyPath: string[]): unknown => {
    if (Array.isArray(value)) {
      return value.map((item, index) => maskValue(item, [...keyPath, String(index)]));
    }

    if (value && typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [nestedKey, nestedValue]) => {
        acc[nestedKey] = maskValue(nestedValue, [...keyPath, nestedKey]);
        return acc;
      }, {});
    }

    const lastKey = keyPath[keyPath.length - 1]?.toLowerCase() ?? "";
    const shouldMask = sensitiveKeywords.some((keyword) => lastKey.includes(keyword));

    if (shouldMask) {
      if (typeof value === "string") {
        return maskString(value);
      }
      if (typeof value === "number") {
        return "***";
      }
      if (typeof value === "boolean") {
        return value;
      }
      return value === null || value === undefined ? value : "***";
    }

    return value;
  };

  return maskValue({ ...data }, []) as Record<string, unknown>;
};


if (typeof window !== 'undefined') {
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
}

// Экспортируем удобные функции для быстрого использования
export const logError = (message: string, error?: Error, context?: string, data?: Record<string, unknown>) =>
  logger.error(message, error, context, data);

export const logWarn = (message: string, context?: string, data?: Record<string, unknown>) =>
  logger.warn(message, context, data);

export const logInfo = (message: string, context?: string, data?: Record<string, unknown>) =>
  logger.info(message, context, data);

export const logDebug = (message: string, context?: string, data?: Record<string, unknown>) =>
  logger.debug(message, context, data);

