import { logger } from "./logger.ts";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Optional prefix for cache keys
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: number | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup completed', { entriesRemoved: cleaned });
    }
  }

  check(identifier: string, config: RateLimitConfig): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
  } {
    const key = config.keyPrefix 
      ? `${config.keyPrefix}:${identifier}` 
      : identifier;

    const now = Date.now();
    const entry = this.store.get(key);

    // No entry or expired window - create new
    if (!entry || now > entry.resetAt) {
      const resetAt = now + config.windowMs;
      this.store.set(key, { count: 1, resetAt });

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetAt,
      };
    }

    // Within window - check count
    if (entry.count < config.maxRequests) {
      entry.count++;
      this.store.set(key, entry);

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    // Rate limit exceeded
    logger.warn('Rate limit exceeded', { 
      key, 
      count: entry.count, 
      limit: config.maxRequests 
    });

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  reset(identifier: string, keyPrefix?: string): void {
    const key = keyPrefix ? `${keyPrefix}:${identifier}` : identifier;
    this.store.delete(key);
    logger.debug('Rate limit reset', { key });
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Balance checks - 20 requests per minute
  balance: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'balance',
  },
  
  // Music generation - 10 requests per minute
  generation: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'generation',
  },
  
  // Strict limit for expensive operations - 5 requests per minute
  expensive: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'expensive',
  },
  
  // Default - 30 requests per minute
  default: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'default',
  },
} as const;

/**
 * Create rate limit headers for HTTP responses
 */
export const createRateLimitHeaders = (result: {
  limit: number;
  remaining: number;
  resetAt: number;
}) => ({
  'X-RateLimit-Limit': result.limit.toString(),
  'X-RateLimit-Remaining': result.remaining.toString(),
  'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  'Retry-After': result.resetAt > Date.now() 
    ? Math.ceil((result.resetAt - Date.now()) / 1000).toString()
    : '0',
});

/**
 * Middleware function to check rate limits
 */
export const checkRateLimit = (
  identifier: string,
  config: RateLimitConfig = rateLimitConfigs.default
): {
  allowed: boolean;
  headers: Record<string, string>;
  result: ReturnType<typeof rateLimiter.check>;
} => {
  const result = rateLimiter.check(identifier, config);
  const headers = createRateLimitHeaders(result);

  return { allowed: result.allowed, headers, result };
};
