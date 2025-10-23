/**
 * E2E Retry Logic Testing
 * Tests exponential backoff and circuit breaker functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Retry Logic & Circuit Breaker', () => {
  test('exponential backoff on API failures', async ({ page, context }) => {
    let attemptCount = 0;
    const attemptTimestamps: number[] = [];

    // Intercept API calls and fail first 2 attempts
    await context.route('**/functions/v1/generate-suno', async (route) => {
      attemptCount++;
      attemptTimestamps.push(Date.now());

      if (attemptCount <= 2) {
        await route.fulfill({
          status: 502,
          body: JSON.stringify({ error: 'Bad Gateway' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            trackId: 'test-track-id',
          }),
        });
      }
    });

    await page.goto('/workspace/generate');

    await page.fill('[data-testid="prompt-input"]', 'Test retry logic');
    await page.click('[data-testid="generate-button"]');

    // Wait for success
    await expect(page.locator('text=/generation started|processing/i')).toBeVisible({
      timeout: 15000,
    });

    // Verify exponential backoff
    expect(attemptCount).toBeGreaterThanOrEqual(3);

    if (attemptTimestamps.length >= 3) {
      const delay1 = attemptTimestamps[1] - attemptTimestamps[0];
      const delay2 = attemptTimestamps[2] - attemptTimestamps[1];

      console.log(`Retry delays: ${delay1}ms, ${delay2}ms`);

      // Second delay should be longer than first (exponential)
      expect(delay2).toBeGreaterThan(delay1);
    }
  });

  test('circuit breaker opens after repeated failures', async ({ page, context }) => {
    let failureCount = 0;

    // Intercept and fail all requests
    await context.route('**/functions/v1/generate-suno', async (route) => {
      failureCount++;
      await route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Service Unavailable' }),
      });
    });

    await page.goto('/workspace/generate');

    // Try to generate multiple times
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="prompt-input"]', `Test ${i}`);
      await page.click('[data-testid="generate-button"]');
      await page.waitForTimeout(2000);
    }

    // Should show circuit breaker notification
    await expect(
      page.locator('text=/circuit.*open|service unavailable|temporarily unavailable/i')
    ).toBeVisible({ timeout: 5000 });

    // Additional requests should be blocked immediately
    const beforeCount = failureCount;
    await page.fill('[data-testid="prompt-input"]', 'Should be blocked');
    await page.click('[data-testid="generate-button"]');
    await page.waitForTimeout(1000);

    // Should not make new API call
    expect(failureCount).toBe(beforeCount);
  });

  test('circuit breaker half-open state recovery', async ({ page, context }) => {
    let requestCount = 0;
    let shouldSucceed = false;

    await context.route('**/functions/v1/generate-suno', async (route) => {
      requestCount++;

      if (shouldSucceed) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, trackId: 'recovery-track' }),
        });
      } else {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      }
    });

    await page.goto('/workspace/generate');

    // Cause failures to open circuit
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="prompt-input"]', `Fail ${i}`);
      await page.click('[data-testid="generate-button"]');
      await page.waitForTimeout(1000);
    }

    // Wait for circuit to potentially enter half-open state
    await page.waitForTimeout(5000);

    // Allow success
    shouldSucceed = true;

    // Try again - should succeed and close circuit
    await page.fill('[data-testid="prompt-input"]', 'Recovery test');
    await page.click('[data-testid="generate-button"]');

    await expect(page.locator('text=/generation started|processing/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('timeout handling', async ({ page, context }) => {
    // Intercept and delay response
    await context.route('**/functions/v1/generate-suno', async (route) => {
      // Delay for 35 seconds (should timeout at 30s)
      await new Promise((resolve) => setTimeout(resolve, 35000));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/workspace/generate');

    await page.fill('[data-testid="prompt-input"]', 'Timeout test');
    await page.click('[data-testid="generate-button"]');

    // Should show timeout error within 35 seconds
    await expect(page.locator('text=/timeout|took too long/i')).toBeVisible({
      timeout: 35000,
    });
  });

  test('retry on rate limit (429)', async ({ page, context }) => {
    let attemptCount = 0;

    await context.route('**/functions/v1/generate-suno', async (route) => {
      attemptCount++;

      if (attemptCount === 1) {
        await route.fulfill({
          status: 429,
          headers: {
            'Retry-After': '2',
          },
          body: JSON.stringify({ error: 'Rate limit exceeded' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, trackId: 'rate-limit-track' }),
        });
      }
    });

    await page.goto('/workspace/generate');

    await page.fill('[data-testid="prompt-input"]', 'Rate limit test');
    await page.click('[data-testid="generate-button"]');

    // Should retry and succeed
    await expect(page.locator('text=/generation started|processing/i')).toBeVisible({
      timeout: 15000,
    });

    expect(attemptCount).toBeGreaterThanOrEqual(2);
  });

  test('no retry on client errors (400)', async ({ page, context }) => {
    let attemptCount = 0;

    await context.route('**/functions/v1/generate-suno', async (route) => {
      attemptCount++;
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Invalid prompt' }),
      });
    });

    await page.goto('/workspace/generate');

    await page.fill('[data-testid="prompt-input"]', '');
    await page.click('[data-testid="generate-button"]');

    await page.waitForTimeout(3000);

    // Should not retry on client errors
    expect(attemptCount).toBe(1);

    // Should show error message
    await expect(page.locator('text=/invalid|error/i')).toBeVisible();
  });
});
