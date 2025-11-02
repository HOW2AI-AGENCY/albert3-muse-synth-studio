/**
 * Advanced Rate Limiting for Edge Functions
 * ✅ P1: Token bucket algorithm with sliding window
 * Prevents abuse and ensures fair resource allocation
 */

import { createSupabaseAdminClient } from "./supabase.ts";
import { logger } from "./logger.ts";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  burstSize?: number; // Allow bursts up to this size
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// Predefined rate limit tiers
export const RATE_LIMIT_TIERS = {
  // Music generation - most expensive
  GENERATION: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    burstSize: 3,
  },
  // Lyrics generation
  LYRICS: {
    maxRequests: 20,
    windowMs: 60 * 1000,
    burstSize: 5,
  },
  // Stem separation
  STEMS: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    burstSize: 2,
  },
  // Balance checks - lightweight
  BALANCE: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    burstSize: 20,
  },
  // AI operations
  AI_OPERATIONS: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    burstSize: 10,
  },
} as const;

/**
 * Token bucket rate limiter with Redis-like storage in Postgres
 */
export class AdvancedRateLimiter {
  private supabase = createSupabaseAdminClient();

  /**
   * Check if request is allowed under rate limit
   */
  async checkLimit(
    userId: string,
    operation: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const bucketKey = `ratelimit:${operation}:${userId}`;

    try {
      // Get or create rate limit bucket
      const { data: bucket, error } = await this.supabase
        .from('rate_limit_buckets')
        .select('*')
        .eq('key', bucketKey)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logger.error('Rate limit check error', error, 'AdvancedRateLimiter');
        // Fail open - allow request on error
        return {
          allowed: true,
          remaining: config.maxRequests,
          resetAt: now + config.windowMs,
        };
      }

      // Initialize new bucket
      if (!bucket) {
        await this.supabase.from('rate_limit_buckets').insert({
          key: bucketKey,
          tokens: config.maxRequests - 1,
          last_refill: now,
          window_start: now,
        });

        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: now + config.windowMs,
        };
      }

      // Refill tokens based on elapsed time (sliding window)
      const elapsedMs = now - bucket.last_refill;
      const tokensToAdd = Math.floor(
        (elapsedMs / config.windowMs) * config.maxRequests
      );
      const currentTokens = Math.min(
        bucket.tokens + tokensToAdd,
        config.burstSize || config.maxRequests
      );

      // Check if request allowed
      if (currentTokens >= 1) {
        // Consume token
        await this.supabase
          .from('rate_limit_buckets')
          .update({
            tokens: currentTokens - 1,
            last_refill: now,
            last_request: now,
          })
          .eq('key', bucketKey);

        return {
          allowed: true,
          remaining: currentTokens - 1,
          resetAt: bucket.window_start + config.windowMs,
        };
      }

      // Rate limit exceeded
      const resetAt = bucket.window_start + config.windowMs;
      const retryAfter = Math.ceil((resetAt - now) / 1000);

      logger.warn('Rate limit exceeded', 'AdvancedRateLimiter', {
        userId,
        operation,
        tokens: currentTokens,
        retryAfter,
      });

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    } catch (error) {
      logger.error('Rate limit error', error as Error, 'AdvancedRateLimiter');
      // Fail open
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }
  }

  /**
   * Cleanup old rate limit buckets (run periodically)
   */
  async cleanup(): Promise<void> {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    await this.supabase
      .from('rate_limit_buckets')
      .delete()
      .lt('last_request', oneDayAgo);

    logger.info('Rate limit buckets cleaned up', 'AdvancedRateLimiter');
  }
}

/**
 * Middleware helper for edge functions
 */
export async function enforceRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMIT_TIERS
): Promise<RateLimitResult> {
  const limiter = new AdvancedRateLimiter();
  const config = RATE_LIMIT_TIERS[operation];
  
  return await limiter.checkLimit(userId, operation, config);
}
