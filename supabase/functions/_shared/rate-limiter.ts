/**
 * Rate Limiter для Edge Functions
 * Защита от DDoS и абьюза
 * 
 * @module rate-limiter
 * @version 1.0.0
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  message?: string;
}

/**
 * In-memory rate limiter store
 * В production можно заменить на Redis
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Cleanup старых записей каждые 5 минут
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Проверяет rate limit для пользователя/IP
 * 
 * @param identifier - user_id или IP адрес
 * @param config - конфигурация лимита
 * @returns результат проверки
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const existing = rateLimitStore.get(key);

  // Если окно истекло, сбрасываем счетчик
  if (existing && existing.resetAt < now) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key);

  if (!current) {
    // Первый запрос в окне
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Проверяем лимит
  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(current.resetAt),
      message: config.message || `Rate limit exceeded. Try again after ${new Date(current.resetAt).toISOString()}`,
    };
  }

  // Увеличиваем счетчик
  current.count++;
  rateLimitStore.set(key, current);

  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetAt: new Date(current.resetAt),
  };
}

/**
 * Middleware для rate limiting в Edge Functions
 * 
 * @example
 * ```typescript
 * const rateLimitResult = await rateLimitMiddleware(req, {
 *   maxRequests: 10,
 *   windowMs: 60 * 1000, // 1 минута
 * });
 * 
 * if (!rateLimitResult.allowed) {
 *   return new Response(rateLimitResult.message, { status: 429 });
 * }
 * ```
 */
export async function rateLimitMiddleware(
  req: Request,
  config: RateLimitConfig,
  supabaseClient?: ReturnType<typeof createClient>
): Promise<RateLimitResult> {
  // Пытаемся получить user_id из JWT
  let identifier: string | null = null;

  if (supabaseClient) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        identifier = user?.id || null;
      } catch (error) {
        console.warn('[RateLimiter] Failed to get user from JWT:', error);
      }
    }
  }

  // Fallback на IP адрес
  if (!identifier) {
    identifier = req.headers.get('x-forwarded-for') || 
                 req.headers.get('cf-connecting-ip') || 
                 'unknown';
  }

  return checkRateLimit(identifier, config);
}

/**
 * Preset конфигурации для разных типов запросов
 */
export const RateLimitPresets = {
  /** Генерация музыки: 10 запросов в минуту */
  MUSIC_GENERATION: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    message: 'Music generation rate limit exceeded. Please wait before generating more tracks.',
  },

  /** Улучшение промптов: 20 запросов в минуту */
  PROMPT_IMPROVEMENT: {
    maxRequests: 20,
    windowMs: 60 * 1000,
    message: 'Prompt improvement rate limit exceeded. Please wait before trying again.',
  },

  /** Генерация текстов: 15 запросов в минуту */
  LYRICS_GENERATION: {
    maxRequests: 15,
    windowMs: 60 * 1000,
    message: 'Lyrics generation rate limit exceeded. Please wait before trying again.',
  },

  /** Stem separation: 5 запросов в минуту */
  STEM_SEPARATION: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    message: 'Stem separation rate limit exceeded. Please wait before trying again.',
  },

  /** Общие API запросы: 100 запросов в минуту */
  GENERAL_API: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    message: 'API rate limit exceeded. Please wait before trying again.',
  },
} as const;

/**
 * Добавляет rate limit headers в Response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): Headers {
  headers.set('X-RateLimit-Limit', String(result.remaining + (result.allowed ? 1 : 0)));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', result.resetAt.toISOString());
  
  if (!result.allowed) {
    headers.set('Retry-After', String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)));
  }

  return headers;
}
