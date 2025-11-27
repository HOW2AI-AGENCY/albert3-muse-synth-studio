/**
 * Unit tests for retryWithBackoff
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff, RETRY_CONFIGS, CircuitBreaker } from '@/utils/retryWithBackoff';

// Mock logger to prevent console noise during tests
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should succeed on the first attempt without delays', async () => {
    const successFn = vi.fn().mockResolvedValue('success');
    const promise = retryWithBackoff(successFn, RETRY_CONFIGS.standard);

    await expect(promise).resolves.toBe('success');
    expect(successFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    vi.useRealTimers(); // Use real timers for this test

    const error1 = new Error('Fail 1') as Error & { status: number };
    error1.status = 503;
    const error2 = new Error('Fail 2') as Error & { status: number };
    error2.status = 503;

    const mockFn = vi.fn()
      .mockImplementationOnce(() => Promise.reject(error1))
      .mockImplementationOnce(() => Promise.reject(error2))
      .mockResolvedValue('success');

    // Use very short delays for test speed
    const config = { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 };

    const result = await retryWithBackoff(mockFn, config);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);

    vi.useFakeTimers(); // Restore fake timers
  });

  it('should reject after exhausting maxAttempts', async () => {
    vi.useRealTimers(); // Use real timers for this test

    const error = new Error('Always fail') as Error & { status: number };
    error.status = 503;

    const failFn = vi.fn().mockImplementation(() => Promise.reject(error));
    const config = { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 };

    await expect(retryWithBackoff(failFn, config)).rejects.toThrow('Always fail');

    expect(failFn).toHaveBeenCalledTimes(3);

    vi.useFakeTimers(); // Restore fake timers
  });

  it('should implement exponential backoff with jitter', async () => {
    vi.useRealTimers(); // Use real timers for this test

    const failFn = vi.fn().mockImplementation(() => Promise.reject(new Error('Fail')));
    const config = { maxAttempts: 4, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2, shouldRetry: () => true };
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    await expect(retryWithBackoff(failFn, config)).rejects.toThrow();

    expect(failFn).toHaveBeenCalledTimes(4);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(3);

    const expectedDelays = [10, 20, 40];
    setTimeoutSpy.mock.calls.forEach((call, index) => {
      const delay = call[1] as number;
      const baseDelay = expectedDelays[index];
      const jitter = baseDelay * 0.2;
      expect(delay).toBeGreaterThanOrEqual(baseDelay - jitter);
      expect(delay).toBeLessThanOrEqual(baseDelay + jitter);
    });

    vi.useFakeTimers(); // Restore fake timers
  });

  it('should not retry on a non-retryable error (e.g., 400)', async () => {
    const error = new Error('Bad Request') as Error & { status: number };
    error.status = 400;
    const failFn = vi.fn().mockImplementation(() => Promise.reject(error));

    const promise = retryWithBackoff(failFn, RETRY_CONFIGS.critical);

    const assertion = expect(promise).rejects.toThrow('Bad Request');
    await vi.runAllTimersAsync(); // Should do nothing
    await assertion;

    expect(failFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on a rate limit error (429)', async () => {
    const error = new Error('Rate Limit') as Error & { status: number };
    error.status = 429;
    const mockFn = vi.fn()
      .mockImplementationOnce(() => Promise.reject(error))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(mockFn, RETRY_CONFIGS.critical);

    const assertion = expect(promise).resolves.toBe('success');
    await vi.runAllTimersAsync();
    await assertion;

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start in a closed state', () => {
    const breaker = new CircuitBreaker(3, 5000);
    expect(breaker.getState()).toBe('closed');
  });

  it('should open after reaching the failure threshold', async () => {
    const breaker = new CircuitBreaker(3, 5000);
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(breaker.getState()).toBe('open');
  });

  it('should reject calls immediately when open', async () => {
    const breaker = new CircuitBreaker(3, 5000);
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    const fn = vi.fn().mockResolvedValue('success');
    await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should transition to half-open after the reset timeout', async () => {
    const breaker = new CircuitBreaker(3, 5000);
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(breaker.getState()).toBe('open');

    // Advance timers to trigger state transition
    await vi.advanceTimersByTimeAsync(5000);

    // Circuit breaker checks time in execute(), so we need to try executing
    const fn = vi.fn().mockResolvedValue('success');
    await breaker.execute(fn);

    expect(fn).toHaveBeenCalled();
    expect(breaker.getState()).toBe('closed'); // After successful execution in half-open, it closes
  });

  it('should close on success when in half-open state', async () => {
    const breaker = new CircuitBreaker(3, 5000);
    // Manually set to half-open for the test
    (breaker as any).state = 'half-open';

    const fn = vi.fn().mockResolvedValue('success');
    await breaker.execute(fn);
    expect(breaker.getState()).toBe('closed');
  });

  it('should re-open on failure when in half-open state', async () => {
    const breaker = new CircuitBreaker(3, 5000);
    (breaker as any).state = 'half-open';

    const fn = vi.fn().mockImplementation(() => Promise.reject(new Error('Fail')));
    await expect(breaker.execute(fn)).rejects.toThrow('Fail');
    expect(breaker.getState()).toBe('open');
  });

  it('should reset the failure count on success', async () => {
    const breaker = new CircuitBreaker(3, 5000);
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect((breaker as any).failureCount).toBe(2);

    // To reset failure count, circuit must be in half-open state and succeed
    // Let's manually set it to half-open and then execute successfully
    (breaker as any).state = 'half-open';
    await breaker.execute(() => Promise.resolve('success'));

    // After successful execution in half-open state, it closes and resets count
    expect(breaker.getState()).toBe('closed');
    expect((breaker as any).failureCount).toBe(0);
  });
});
