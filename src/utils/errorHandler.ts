/**
 * Enhanced Error Handling with Categorization
 * Provides structured error handling for better monitoring and user feedback
 */

import * as Sentry from '@sentry/react';
import { logger } from './logger';

export enum ErrorCategory {
  GENERATION = 'generation',
  API = 'api',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  PAYMENT = 'payment',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: ErrorCategory,
    public statusCode: number,
    public isOperational = true,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = {
  handle(error: Error | AppError, context: string) {
    if (error instanceof AppError && error.isOperational) {
      // Expected operational error
      logger.warn(error.message, context, { 
        code: error.code, 
        category: error.category,
        statusCode: error.statusCode,
        ...error.metadata 
      });

      // Send to Sentry with category
      Sentry.captureException(error, {
        level: 'warning',
        tags: {
          category: error.category,
          code: error.code,
          isOperational: 'true',
        },
        contexts: {
          error: error.metadata,
        },
      });

      return {
        title: this.getUserFriendlyTitle(error.category),
        description: error.message,
        variant: 'destructive' as const,
      };
    }

    // Unexpected error - full logging
    logger.error('Unexpected error', error, context);
    Sentry.captureException(error, {
      level: 'error',
      tags: { 
        category: ErrorCategory.UNKNOWN,
        isOperational: 'false',
      },
    });

    return {
      title: 'Неожиданная ошибка',
      description: 'Попробуйте позже или обратитесь в поддержку',
      variant: 'destructive' as const,
    };
  },

  getUserFriendlyTitle(category: ErrorCategory): string {
    const titles: Record<ErrorCategory, string> = {
      [ErrorCategory.GENERATION]: 'Ошибка генерации',
      [ErrorCategory.API]: 'Ошибка API',
      [ErrorCategory.DATABASE]: 'Ошибка базы данных',
      [ErrorCategory.AUTHENTICATION]: 'Ошибка аутентификации',
      [ErrorCategory.PAYMENT]: 'Ошибка оплаты',
      [ErrorCategory.RATE_LIMIT]: 'Превышен лимит запросов',
      [ErrorCategory.NETWORK]: 'Ошибка сети',
      [ErrorCategory.VALIDATION]: 'Ошибка валидации',
      [ErrorCategory.UNKNOWN]: 'Неизвестная ошибка',
    };
    return titles[category] || titles[ErrorCategory.UNKNOWN];
  },
};

// Helper functions for creating typed errors

export const createGenerationError = (
  message: string, 
  code: string, 
  metadata?: Record<string, unknown>
) => new AppError(message, code, ErrorCategory.GENERATION, 400, true, metadata);

export const createRateLimitError = (
  provider: string, 
  retryAfter?: number
) => new AppError(
  `Превышен лимит запросов к ${provider}. Попробуйте через ${retryAfter || 60} секунд.`,
  'RATE_LIMIT_EXCEEDED',
  ErrorCategory.RATE_LIMIT,
  429,
  true,
  { provider, retryAfter }
);

export const createNetworkError = (
  message: string = 'Проблема с сетевым подключением'
) => new AppError(
  message,
  'NETWORK_ERROR',
  ErrorCategory.NETWORK,
  0,
  true
);

export const createValidationError = (
  field: string,
  message: string
) => new AppError(
  `Ошибка валидации поля "${field}": ${message}`,
  'VALIDATION_ERROR',
  ErrorCategory.VALIDATION,
  400,
  true,
  { field }
);

export const createAuthError = (
  message: string = 'Требуется авторизация'
) => new AppError(
  message,
  'AUTH_ERROR',
  ErrorCategory.AUTHENTICATION,
  401,
  true
);

export const createPaymentError = (
  message: string = 'Недостаточно средств'
) => new AppError(
  message,
  'PAYMENT_REQUIRED',
  ErrorCategory.PAYMENT,
  402,
  true
);
