import { useCallback } from 'react';
import { rateLimiter, RATE_LIMIT_CONFIGS, formatResetTime } from '@/utils/rateLimiter';

export const useGenerationRateLimit = (userId: string | undefined) => {
  const check = useCallback(() => {
    if (!userId) {
      return {
        allowed: false,
        reason: 'Unauthorized',
        message: 'Пожалуйста, войдите в систему, чтобы продолжить.',
      };
    }

    const rateLimit = rateLimiter.check(userId, RATE_LIMIT_CONFIGS.GENERATION);

    if (!rateLimit.allowed) {
        const resetTime = formatResetTime(rateLimit.resetAt);
        return {
            allowed: false,
            reason: 'Rate limit exceeded',
            message: `Вы можете создать не более ${RATE_LIMIT_CONFIGS.GENERATION.maxRequests} треков в минуту. Попробуйте снова через ${resetTime}.`,
        };
    }

    return {
      allowed: true,
      reason: null,
      message: null,
    };
  }, [userId]);

  return { check };
};
