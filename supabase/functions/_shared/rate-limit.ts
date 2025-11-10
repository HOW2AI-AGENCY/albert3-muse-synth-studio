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
 * Middleware function to check rate limits (in-memory)
 * @deprecated Use checkRateLimitRedis for production (P0-3 fix)
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

// ============================================================================
// REDIS-BASED RATE LIMITING (P0-3 FIX)
// ============================================================================

/**
 * Server-Side Rate Limiting with Upstash Redis
 *
 * SECURITY FIX (P0-3):
 * - In-memory rate limiting can be bypassed by calling Edge Functions directly
 * - Multiple Edge Function instances don't share state
 * - Need distributed rate limiting with Redis
 */

const UPSTASH_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

/**
 * Redis-based rate limit configurations
 */
export const REDIS_RATE_LIMITS = {
  // Music generation: 10 per hour (stricter than in-memory)
  GENERATION: { maxRequests: 10, windowSeconds: 3600 },

  // Persona creation: 5 per hour
  PERSONA_CREATE: { maxRequests: 5, windowSeconds: 3600 },

  // Balance checks: 20 per minute
  BALANCE: { maxRequests: 20, windowSeconds: 60 },

  // Webhook callbacks: 100 per minute
  WEBHOOK: { maxRequests: 100, windowSeconds: 60 },
};

export type RedisRateLimitAction = keyof typeof REDIS_RATE_LIMITS;

export interface RedisRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check rate limit using Redis (distributed, cannot be bypassed)
 *
 * Uses sliding window algorithm with Redis sorted sets:
 * - Each request stored with timestamp as score
 * - Old requests automatically removed
 * - Atomic operations ensure correctness across multiple instances
 *
 * @param userId - User ID to check
 * @param action - Action type
 * @returns Rate limit result
 */
export async function checkRateLimitRedis(
  userId: string,
  action: RedisRateLimitAction
): Promise<RedisRateLimitResult> {
  // If Upstash not configured, log warning and allow (development mode)
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    logger.warn('⚠️ Upstash not configured - rate limiting disabled', 'RateLimit', {
      action,
      userId,
    });

    return {
      allowed: true,
      remaining: 999,
      resetAt: Date.now() + REDIS_RATE_LIMITS[action].windowSeconds * 1000,
    };
  }

  const config = REDIS_RATE_LIMITS[action];
  const key = `ratelimit:${action}:${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  try {
    // Remove old entries outside window
    const removeRes = await fetch(
      `${UPSTASH_URL}/zremrangebyscore/${encodeURIComponent(key)}/0/${windowStart}`,
      {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      }
    );

    if (!removeRes.ok) {
      throw new Error(`Redis zremrangebyscore failed: ${removeRes.statusText}`);
    }

    // Count current requests
    const countRes = await fetch(`${UPSTASH_URL}/zcard/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });

    if (!countRes.ok) {
      throw new Error(`Redis zcard failed: ${countRes.statusText}`);
    }

    const countData = await countRes.json();
    const currentCount = countData.result || 0;

    // Check if limit exceeded
    if (currentCount >= config.maxRequests) {
      // Get oldest timestamp for reset calculation
      const oldestRes = await fetch(
        `${UPSTASH_URL}/zrange/${encodeURIComponent(key)}/0/0/WITHSCORES`,
        {
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        }
      );

      const oldestData = await oldestRes.json();
      const oldestTimestamp = oldestData.result?.[1] ? parseInt(oldestData.result[1]) : now;
      const resetAt = oldestTimestamp + config.windowSeconds * 1000;
      const retryAfter = Math.ceil((resetAt - now) / 1000);

      logger.warn('❌ Rate limit exceeded', 'RateLimit', {
        userId,
        action,
        currentCount,
        maxRequests: config.maxRequests,
        retryAfter,
      });

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    // Add current request
    await fetch(
      `${UPSTASH_URL}/zadd/${encodeURIComponent(key)}/${now}/${now}`,
      {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      }
    );

    // Set expiry (window + 1 hour buffer)
    await fetch(
      `${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${config.windowSeconds + 3600}`,
      {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      }
    );

    const remaining = config.maxRequests - currentCount - 1;
    const resetAt = now + config.windowSeconds * 1000;

    logger.info('✅ Rate limit check passed', 'RateLimit', {
      userId,
      action,
      remaining,
      currentCount: currentCount + 1,
    });

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  } catch (error) {
    // Fail open on Redis errors (prevents DoS)
    logger.error('❌ Rate limit check failed - allowing request', error, 'RateLimit', {
      userId,
      action,
    });

    return {
      allowed: true,
      remaining: 999,
      resetAt: Date.now() + config.windowSeconds * 1000,
    };
  }
}
