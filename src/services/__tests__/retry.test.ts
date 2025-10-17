/**
 * Retry Logic Tests
 * SPRINT 28: Testing Infrastructure & Bug Fixes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock retry logic для тестов
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  shouldRetry: (error: unknown) => boolean;
}

const mockRetryConfigs = {
  sunoApi: {
    maxAttempts: 4,
    baseDelay: 1000,
    shouldRetry: (error: unknown) => {
      if (error instanceof Error) {
        return !error.message.includes('Unauthorized');
      }
      return true;
    },
  },
};

async function mockRetryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<{ result: T; metrics: { totalAttempts: number } }> {
  let totalAttempts = 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    totalAttempts = attempt;
    try {
      const result = await fn();
      return { result, metrics: { totalAttempts } };
    } catch (error) {
      lastError = error;
      if (!config.shouldRetry(error) || attempt === config.maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, config.baseDelay));
    }
  }

  throw lastError;
}

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Operations', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue({ success: true });

      const result = await mockRetryWithBackoff(mockFn, mockRetryConfigs.sunoApi);

      expect(result.result).toEqual({ success: true });
      expect(result.metrics.totalAttempts).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry Behavior', () => {
    it('should retry on failure and eventually succeed', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue({ success: true });

      const result = await mockRetryWithBackoff(mockFn, mockRetryConfigs.sunoApi);

      expect(result.result).toEqual({ success: true });
      expect(result.metrics.totalAttempts).toBe(3);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        mockRetryWithBackoff(mockFn, { maxAttempts: 2, baseDelay: 10, shouldRetry: () => true })
      ).rejects.toThrow('Always fails');

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Specific Error Handling', () => {
    it('should not retry on authentication errors', async () => {
      const authError = new Error('Unauthorized');
      const mockFn = vi.fn().mockRejectedValue(authError);

      await expect(
        mockRetryWithBackoff(mockFn, mockRetryConfigs.sunoApi)
      ).rejects.toThrow('Unauthorized');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({ success: true });

      const result = await mockRetryWithBackoff(mockFn, mockRetryConfigs.sunoApi);

      expect(result.result).toEqual({ success: true });
      expect(result.metrics.totalAttempts).toBe(2);
    });
  });
});

