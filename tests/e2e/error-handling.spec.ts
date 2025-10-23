/**
 * E2E Error Handling Testing
 * Tests error recovery and user feedback
 */

import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('network failure recovery', async ({ page, context }) => {
    await context.route('**/functions/v1/generate-suno', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/workspace/generate');

    await page.fill('[data-testid="prompt-input"]', 'Test network failure');
    await page.click('[data-testid="generate-button"]');

    // Should show error message
    await expect(page.locator('text=/network.*error|connection.*failed/i')).toBeVisible({
      timeout: 10000,
    });

    // Remove network failure
    await context.unroute('**/functions/v1/generate-suno');
    await context.route('**/functions/v1/generate-suno', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    // Retry should work
    const retryButton = page.locator('button:has-text("Retry")').first();
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await expect(page.locator('text=/generation started|processing/i')).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('partial provider failure - fallback to working provider', async ({ page, context }) => {
    // Suno fails, Mureka works
    await context.route('**/functions/v1/generate-suno', async (route) => {
      await route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Service unavailable' }),
      });
    });

    await context.route('**/functions/v1/generate-mureka', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, trackId: 'mureka-track' }),
      });
    });

    await page.goto('/workspace/generate');

    // Select Suno provider
    const providerSelect = page.locator('[data-testid="provider-select"]');
    if (await providerSelect.isVisible()) {
      await providerSelect.click();
      await page.click('text=Suno');
    }

    await page.fill('[data-testid="prompt-input"]', 'Test fallback');
    await page.click('[data-testid="generate-button"]');

    // Should either show error or automatically fall back to working provider
    await page.waitForTimeout(5000);

    // If fallback is implemented, should succeed
    // Otherwise, should show clear error message
    const hasError = await page.locator('text=/error|failed/i').isVisible();
    const hasSuccess = await page.locator('text=/generation started|processing/i').isVisible();

    expect(hasError || hasSuccess).toBeTruthy();
  });

  test('invalid API response handling', async ({ page, context }) => {
    await context.route('**/functions/v1/generate-suno', async (route) => {
      await route.fulfill({
        status: 200,
        body: 'Invalid JSON response',
      });
    });

    await page.goto('/workspace/generate');

    await page.fill('[data-testid="prompt-input"]', 'Test invalid response');
    await page.click('[data-testid="generate-button"]');

    // Should show error message about invalid response
    await expect(page.locator('text=/error|invalid.*response|unexpected.*error/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('authentication error handling', async ({ page, context }) => {
    await context.route('**/functions/v1/generate-suno', async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.goto('/workspace/generate');

    await page.fill('[data-testid="prompt-input"]', 'Test auth error');
    await page.click('[data-testid="generate-button"]');

    // Should redirect to login or show auth error
    await expect(
      page.locator('text=/sign.*in|log.*in|unauthorized|authentication.*required/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('error boundary catches React errors', async ({ page }) => {
    await page.goto('/');

    // Inject error-causing code
    await page.evaluate(() => {
      const errorButton = document.createElement('button');
      errorButton.id = 'cause-error';
      errorButton.textContent = 'Cause Error';
      errorButton.onclick = () => {
        throw new Error('Test error boundary');
      };
      document.body.appendChild(errorButton);
    });

    // Click button to cause error
    await page.click('#cause-error');

    // Should show error boundary fallback
    await expect(
      page.locator('text=/something went wrong|unexpected error/i')
    ).toBeVisible({ timeout: 5000 });

    // Should have recovery options
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });

  test('graceful degradation on feature unavailable', async ({ page, context }) => {
    // Make lyrics generation unavailable
    await context.route('**/functions/v1/generate-lyrics', async (route) => {
      await route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Feature temporarily unavailable' }),
      });
    });

    await page.goto('/workspace/generate');

    // Try to generate lyrics
    const lyricsButton = page.locator('[data-testid="generate-lyrics-button"]');
    if (await lyricsButton.isVisible()) {
      await lyricsButton.click();

      // Should show feature unavailable message
      await expect(
        page.locator('text=/temporarily unavailable|feature.*unavailable/i')
      ).toBeVisible({ timeout: 5000 });

      // Main generation should still work
      await page.fill('[data-testid="prompt-input"]', 'Test without lyrics');
      await page.click('[data-testid="generate-button"]');

      // Should not block main functionality
      await page.waitForTimeout(2000);
    }
  });

  test('user-friendly error messages', async ({ page, context }) => {
    await context.route('**/functions/v1/generate-suno', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Database connection failed',
        }),
      });
    });

    await page.goto('/workspace/generate');

    await page.fill('[data-testid="prompt-input"]', 'Test error message');
    await page.click('[data-testid="generate-button"]');

    await page.waitForTimeout(3000);

    // Error message should be user-friendly (not technical)
    const errorText = await page.locator('[role="alert"], .toast, [data-testid="error-message"]')
      .first()
      .textContent();

    if (errorText) {
      // Should not contain technical details
      expect(errorText.toLowerCase()).not.toContain('database');
      expect(errorText.toLowerCase()).not.toContain('500');
    }
  });
});
