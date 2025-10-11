import { logger } from "./logger.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

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
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.sunoapi.org",
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
  override cause?: unknown;
  
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "RateLimitUnavailableError";
    this.cause = cause;
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
    const now = new Date();
    const resetTime = new Date(now.getTime() + windowMinutes * 60 * 1000);
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      logger.warn("Rate limiter disabled due to missing secrets", { endpoint, userId });
      return { allowed: true, remaining: maxRequests, resetTime };
    }

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
        // Table doesn't exist, allow request
        logger.warn("Rate limit table not found, allowing request", { endpoint, userId, errorCode: error.code });
        return { allowed: true, remaining: maxRequests, resetTime };
      }

      const requestCount = requests?.length || 0;
      const remaining = Math.max(0, maxRequests - requestCount);

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
        // Table doesn't exist, allow request anyway
        logger.warn("Failed to store rate limit, allowing request", { endpoint, userId, errorCode: insertError.code });
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
export const createRateLimitResponse = (
  resetTime: Date,
  options: {
    request?: Request;
    corsHeaders?: Record<string, string>;
    securityHeaders?: Record<string, string>;
  } = {}
) => {
  const { request, corsHeaders, securityHeaders } = options;
  const resolvedCorsHeaders = corsHeaders ?? createCorsHeaders(request);
  const resolvedSecurityHeaders = securityHeaders ?? createSecurityHeaders();

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
        ...resolvedCorsHeaders,
        ...resolvedSecurityHeaders
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

    const corsHeaders = createCorsHeaders(req);
    const securityHeaders = createSecurityHeaders();

    try {
      if (req.method === 'OPTIONS') {
        return handleCorsPreflightRequest(req);
      }

      // Извлекаем пользователя из токена
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const hasAuth = !!authHeader;
      
      logger.info(`[${endpoint}] Middleware entry`, { 
        method: req.method,
        hasAuthorization: hasAuth,
        endpoint
      });

      if (!token) {
        logger.error(`[${endpoint}] ❌ middleware-401: Missing authorization header`, { endpoint });
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders } }
        );
      }

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE');

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        logger.error('Supabase URL or anon key missing', { endpoint });
        return new Response(
          JSON.stringify({ error: 'Service Unavailable', message: 'Supabase credentials are not configured' }),
          { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders } }
        );
      }

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      if (authError || !user) {
        logger.error(`[${endpoint}] ❌ middleware-401: Invalid or expired token`, { endpoint, error: authError?.message });
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders } }
        );
      }

      logger.info(`[${endpoint}] ✅ Auth validated, userId: ${user.id.substring(0, 8)}..., injecting X-User-Id`, { endpoint, userId: user.id });

      // Clone request and inject X-User-Id header for handler
      const clonedHeaders = new Headers(req.headers);
      clonedHeaders.set('X-User-Id', user.id);
      
      const clonedRequest = new Request(req.url, {
        method: req.method,
        headers: clonedHeaders,
        body: req.body,
      });

      let rateLimitInfo:
        | { allowed: boolean; remaining: number; resetTime: Date }
        | null = null;
      let rateLimitApplied = false;

      if (!SUPABASE_SERVICE_ROLE_KEY) {
        logger.warn('Rate limiter disabled: service role key missing', { endpoint });
      } else {
        const rateLimiter = new RateLimiter(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        try {
          rateLimitInfo = await rateLimiter.checkRateLimit(
            user.id,
            endpoint,
            maxRequests,
            windowMinutes
          );
          rateLimitApplied = true;
        } catch (error) {
          if (error instanceof RateLimitUnavailableError) {
            logger.warn('Rate limiter unavailable, allowing request', { endpoint, error: error.message });
          } else {
            throw error;
          }
        }
      }

      if (rateLimitApplied && rateLimitInfo && !rateLimitInfo.allowed) {
        logger.warn(`[${endpoint}] ⚠️ Rate limit exceeded for user ${user.id.substring(0, 8)}...`, { endpoint, userId: user.id });
        return createRateLimitResponse(rateLimitInfo.resetTime, { corsHeaders, securityHeaders });
      }

      logger.info(`[${endpoint}] Rate limit OK, forwarding to handler with X-User-Id`, { endpoint });
      const response = await handler(clonedRequest);
      const headers = new Headers(response.headers);

      if (rateLimitApplied && rateLimitInfo) {
        headers.set('X-RateLimit-Limit', maxRequests.toString());
        headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
        headers.set('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString());
      } else {
        headers.set('X-RateLimit-Policy', 'disabled');
      }

      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      Object.entries(securityHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        logger.warn('Rate limiter unavailable after check, allowing request', { endpoint, error: error.message });
        const response = await handler(req);
        const headers = new Headers(response.headers);
        headers.set('X-RateLimit-Policy', 'disabled');

        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        Object.entries(securityHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }

      logger.error('Rate limit middleware error', { endpoint, error });
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders } }
      );
    }
  };
};