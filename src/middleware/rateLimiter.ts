/**
 * Rate Limiter Middleware
 * Защита от злоупотреблений через ограничение частоты запросов
 */

export interface RateLimitConfig {
  max: number;          // Макс. количество запросов
  window: number;       // Временное окно (мс)
  keyGenerator: () => Promise<string>;  // Функция генерации ключа (user_id)
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private cleanupInterval: number | null = null;
  
  constructor(private config: RateLimitConfig) {
    // Очистка каждую минуту
    this.cleanupInterval = window.setInterval(() => this.cleanup(), 60 * 1000);
  }
  
  async check(): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = await this.config.keyGenerator();
    const now = Date.now();
    
    const entry = this.cache.get(key);
    
    if (!entry || now > entry.resetAt) {
      // Новое окно
      const resetAt = now + this.config.window;
      this.cache.set(key, {
        count: 1,
        resetAt,
      });
      return {
        allowed: true,
        remaining: this.config.max - 1,
        resetAt,
      };
    }
    
    if (entry.count >= this.config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }
    
    entry.count++;
    return {
      allowed: true,
      remaining: this.config.max - entry.count,
      resetAt: entry.resetAt,
    };
  }
  
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetAt) {
        this.cache.delete(key);
      }
    }
  }
  
  destroy() {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// ============= READY-TO-USE RATE LIMITERS =============

/**
 * Rate limiter для генерации музыки
 * Лимит: 10 запросов в минуту на пользователя
 */
export const generationRateLimiter = new RateLimiter({
  max: 10,
  window: 60 * 1000, // 1 минута
  keyGenerator: async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  },
});

/**
 * Rate limiter для разделения стемов
 * Лимит: 5 запросов в минуту на пользователя
 */
export const stemsRateLimiter = new RateLimiter({
  max: 5,
  window: 60 * 1000,
  keyGenerator: async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  },
});

/**
 * Rate limiter для генерации текстов
 * Лимит: 20 запросов в минуту на пользователя
 */
export const lyricsRateLimiter = new RateLimiter({
  max: 20,
  window: 60 * 1000,
  keyGenerator: async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  },
});

/**
 * Rate limiter для API запросов (общий)
 * Лимит: 100 запросов в минуту на пользователя
 */
export const apiRateLimiter = new RateLimiter({
  max: 100,
  window: 60 * 1000,
  keyGenerator: async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  },
});
