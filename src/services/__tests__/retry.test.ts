/**
 * Retry Logic Tests
 * SPRINT 28: Testing Infrastructure & Bug Fixes
 * ✅ Updated: Added tests for non-retryable errors
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock retry logic для тестов
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  shouldRetry: (error: unknown) => boolean;
}

// Helper to check if error is retryable
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const nonRetryablePatterns = [
      'unauthorized',
      'недостаточно кредитов',
      'insufficient credits',
      'bad request',
      'invalid',
    ];
    return !nonRetryablePatterns.some(pattern => message.includes(pattern));
  }
  return true;
}

const mockRetryConfigs = {
  sunoApi: {
    maxAttempts: 4,
    baseDelay: 1000,
    shouldRetry: (error: unknown) => isRetryableError(error),
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

    it('should not retry on insufficient credits errors', async () => {
      const creditsError = new Error('Недостаточно кредитов Suno');
      const mockFn = vi.fn().mockRejectedValue(creditsError);

      await expect(
        mockRetryWithBackoff(mockFn, mockRetryConfigs.sunoApi)
      ).rejects.toThrow('Недостаточно кредитов');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on bad request errors', async () => {
      const badRequestError = new Error('Bad request - invalid parameters');
      const mockFn = vi.fn().mockRejectedValue(badRequestError);

      await expect(
        mockRetryWithBackoff(mockFn, mockRetryConfigs.sunoApi)
      ).rejects.toThrow('Bad request');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limit errors with retry', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({ success: true });

      const result = await mockRetryWithBackoff(mockFn, mockRetryConfigs.sunoApi);

      expect(result.result).toEqual({ success: true });
      expect(result.metrics.totalAttempts).toBe(2);
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network timeout');
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ success: true });

      const result = await mockRetryWithBackoff(mockFn, mockRetryConfigs.sunoApi);

      expect(result.result).toEqual({ success: true });
      expect(result.metrics.totalAttempts).toBe(2);
    });
  });
});

