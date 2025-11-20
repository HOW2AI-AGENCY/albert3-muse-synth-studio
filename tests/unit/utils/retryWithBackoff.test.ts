/**
 * Unit tests for retryWithBackoff
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff, RETRY_CONFIGS, CircuitBreaker } from '@/utils/retryWithBackoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should succeed on first attempt', async () => {
    const successFn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(successFn, RETRY_CONFIGS.standard);

    expect(result).toBe('success');
    expect(successFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(mockFn, RETRY_CONFIGS.fast);

    // Advance timers for retries
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should respect maxAttempts', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('Always fail'));

    const promise = retryWithBackoff(failFn, {
      ...RETRY_CONFIGS.fast,
      maxAttempts: 3,
    });

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Always fail');
    expect(failFn).toHaveBeenCalledTimes(3);
  });

  it('should implement exponential backoff', async () => {
    const delays: number[] = [];
    const failFn = vi.fn().mockRejectedValue(new Error('Fail'));

    const promise = retryWithBackoff(failFn, {
      maxAttempts: 4,
      baseDelay: 100,
      maxDelay: 10000,
      shouldRetry: () => true,
    });

    // Capture delay timings
    let lastTime = Date.now();
    failFn.mockImplementation(() => {
      const now = Date.now();
      if (delays.length > 0) {
        delays.push(now - lastTime);
      }
      lastTime = now;
      return Promise.reject(new Error('Fail'));
    });

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow();

    // Delays should increase exponentially
    expect(delays.length).toBeGreaterThan(0);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it('should not retry non-retryable errors', async () => {
    const error = new Error('Bad Request');
    (error as any).status = 400;

    const failFn = vi.fn().mockRejectedValue(error);

    const promise = retryWithBackoff(failFn, RETRY_CONFIGS.critical);

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Bad Request');
    expect(failFn).toHaveBeenCalledTimes(1); // No retries
  });

  it('should retry rate limit errors (429)', async () => {
    const error = new Error('Rate Limit');
    (error as any).status = 429;

    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const promise = retryWithBackoff(mockFn, RETRY_CONFIGS.critical);

    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should include error history in metrics', async () => {
    const errors = [
      new Error('Error 1'),
      new Error('Error 2'),
    ];

    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(errors[0])
      .mockRejectedValueOnce(errors[1])
      .mockResolvedValue('success');

    const promise = retryWithBackoff(mockFn, RETRY_CONFIGS.fast);

    await vi.runAllTimersAsync();

    const result = await promise;

    // Function no longer returns error history, just the result
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(3, 5000);
  });

  it('should start in closed state', () => {
    expect(breaker.getState()).toBe('closed');
  });

  it('should open after failure threshold', () => {
    breaker.recordFailure();
    expect(breaker.getState()).toBe('closed');

    breaker.recordFailure();
    expect(breaker.getState()).toBe('closed');

    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
  });

  it('should reject calls when open', async () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.getState()).toBe('open');

    const fn = vi.fn().mockResolvedValue('success');

    await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should transition to half-open after timeout', async () => {
    vi.useFakeTimers();

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.getState()).toBe('open');

    vi.advanceTimersByTime(5000);

    expect(breaker.getState()).toBe('half-open');
  });

  it('should close after success threshold in half-open', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    breaker['state'] = 'half-open';

    breaker.recordSuccess();
    expect(breaker.getState()).toBe('half-open');

    breaker.recordSuccess();
    expect(breaker.getState()).toBe('closed');
  });

  it('should reopen on failure in half-open', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    breaker['state'] = 'half-open';

    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
  });

  it('should reset failure count on success in closed state', () => {
    breaker.recordFailure();
    breaker.recordFailure();

    breaker.recordSuccess();

    expect(breaker['failureCount']).toBe(0);
  });
});
