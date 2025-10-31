/**
 * Client-side Rate Limiter
 * Prevents excessive generation requests to protect API and improve UX
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   * @param identifier - User ID or IP address
   * @param config - Rate limit configuration
   * @returns { allowed: boolean, remaining: number, resetAt: number }
   */
  check(identifier: string, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No previous requests or window expired
    if (!entry || now >= entry.resetAt) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + config.windowMs,
      };
      this.store.set(identifier, newEntry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: newEntry.resetAt,
      };
    }

    // Within rate limit
    if (entry.count < config.maxRequests) {
      entry.count++;
      this.store.set(identifier, entry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy rate limiter and cleanup
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Predefined configurations
export const RATE_LIMIT_CONFIGS = {
  GENERATION: {
    maxRequests: 10,      // 10 requests
    windowMs: 60 * 1000,  // per minute
  },
  LYRICS: {
    maxRequests: 20,      // 20 requests
    windowMs: 60 * 1000,  // per minute
  },
  STEMS: {
    maxRequests: 5,       // 5 requests
    windowMs: 60 * 1000,  // per minute
  },
} as const;

/**
 * Format time remaining until reset
 */
export const formatResetTime = (resetAt: number): string => {
  const seconds = Math.ceil((resetAt - Date.now()) / 1000);
  if (seconds < 60) return `${seconds} секунд`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} минут`;
};
