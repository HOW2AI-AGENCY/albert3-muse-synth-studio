import { logger } from "./logger.ts";

/**
 * Модуль безопасности для Edge Functions
 * Включает заголовки безопасности и rate limiting
 */

/**
 * Создает заголовки безопасности
 */
export const createSecurityHeaders = () => {
  return {
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.suno.ai https://api.sunoapi.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    
    // HTTP Strict Transport Security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Предотвращение clickjacking
    'X-Frame-Options': 'DENY',
    
    // Предотвращение MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ].join(', ')
  };
};

export class RateLimitUnavailableError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "RateLimitUnavailableError";
  }
}

/**
 * Rate Limiting с использованием Supabase
 */
export class RateLimiter {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  /**
   * Проверяет rate limit для пользователя
   */
  async checkRateLimit(
    userId: string,
    endpoint: string,
    maxRequests: number = 10,
    windowMinutes: number = 1
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    if (!this.supabaseUrl || !this.supabaseKey) {
      logger.error("Rate limiter configuration missing", { endpoint, userId });
      throw new RateLimitUnavailableError("Rate limiter secrets are not configured");
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
      const supabase = createClient(this.supabaseUrl, this.supabaseKey);

      const { data: requests, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
        .gte('created_at', windowStart.toISOString());

      if (error) {
        logger.error("Failed to query rate limit storage", { endpoint, userId, error });
        throw new RateLimitUnavailableError("Rate limit storage unavailable", error);
      }

      const requestCount = requests?.length || 0;
      const remaining = Math.max(0, maxRequests - requestCount);
      const resetTime = new Date(now.getTime() + windowMinutes * 60 * 1000);

      if (requestCount >= maxRequests) {
        return { allowed: false, remaining: 0, resetTime };
      }

      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          user_id: userId,
          endpoint: endpoint,
          created_at: now.toISOString()
        });

      if (insertError) {
        logger.error("Failed to store rate limit usage", { endpoint, userId, error: insertError });
        throw new RateLimitUnavailableError("Rate limit storage unavailable", insertError);
      }

      return { allowed: true, remaining: remaining - 1, resetTime };
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        throw error;
      }

      logger.error("Unexpected rate limiter error", { endpoint, userId, error });
      throw new RateLimitUnavailableError("Unexpected rate limiter failure", error);
    }
  }

  /**
   * Очищает старые записи rate limit
   */
  async cleanupOldRecords(olderThanHours: number = 24): Promise<void> {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
      const supabase = createClient(this.supabaseUrl, this.supabaseKey);

      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

      await supabase
        .from('rate_limits')
        .delete()
        .lt('created_at', cutoffTime.toISOString());
    } catch (error) {
      logger.error('Rate limit cleanup error', { error });
    }
  }
}

/**
 * Создает ответ с ошибкой rate limit
 */
export const createRateLimitResponse = (resetTime: Date) => {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Слишком много запросов. Попробуйте позже.',
      resetTime: resetTime.toISOString()
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString(),
        ...createSecurityHeaders()
      }
    }
  );
};

/**
 * Middleware для проверки rate limit
 */
export const withRateLimit = (
  handler: (req: Request) => Promise<Response>,
  options: {
    maxRequests?: number;
    windowMinutes?: number;
    endpoint: string;
  }
) => {
  return async (req: Request): Promise<Response> => {
    const { maxRequests = 10, windowMinutes = 1, endpoint } = options;

    try {
      // Извлекаем пользователя из токена
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...createSecurityHeaders() } }
        );
      }

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE");

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        logger.error("Rate limiter secrets missing", { endpoint });
        return new Response(
          JSON.stringify({
            error: 'Service Unavailable',
            message: 'Rate limiter configuration missing',
          }),
          { status: 503, headers: { 'Content-Type': 'application/json', ...createSecurityHeaders() } }
        );
      }

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...createSecurityHeaders() } }
        );
      }

      // Проверяем rate limit
      const rateLimiter = new RateLimiter(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { allowed, remaining, resetTime } = await rateLimiter.checkRateLimit(
        user.id,
        endpoint,
        maxRequests,
        windowMinutes
      );

      if (!allowed) {
        return createRateLimitResponse(resetTime);
      }

      // Выполняем основной обработчик
      const response = await handler(req);
      
      // Добавляем заголовки rate limit в ответ
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', maxRequests.toString());
      headers.set('X-RateLimit-Remaining', remaining.toString());
      headers.set('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000).toString());
      
      // Добавляем заголовки безопасности
      Object.entries(createSecurityHeaders()).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });

    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        logger.error('Rate limiter unavailable', { endpoint, error: error.message });
        return new Response(
          JSON.stringify({
            error: 'Service Unavailable',
            message: 'Rate limiting temporarily unavailable',
          }),
          { status: 503, headers: { 'Content-Type': 'application/json', ...createSecurityHeaders() } }
        );
      }

      logger.error('Rate limit middleware error', { endpoint, error });
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...createSecurityHeaders() } }
      );
    }
  };
};