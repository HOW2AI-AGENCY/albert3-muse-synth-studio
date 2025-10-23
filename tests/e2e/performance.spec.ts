/**
 * E2E Performance Testing
 * Tests system performance under various load conditions
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('music generation under load - 5 concurrent requests', async ({ page, context }) => {
    await page.goto('/workspace/generate');

    // Create 5 concurrent generation requests
    const pages = await Promise.all(
      Array.from({ length: 5 }, () => context.newPage())
    );

    const startTime = Date.now();

    try {
      await Promise.all(
        pages.map(async (p, index) => {
          await p.goto('/workspace/generate');
          await p.fill('[data-testid="prompt-input"]', `Test song ${index}`);
          await p.click('[data-testid="generate-button"]');
        })
      );

      const duration = Date.now() - startTime;

      // Should handle concurrent requests within reasonable time (< 30s)
      expect(duration).toBeLessThan(30000);

      // Verify all requests started processing
      for (const p of pages) {
        await expect(p.locator('[data-testid="generation-status"]')).toBeVisible({
          timeout: 5000,
        });
      }
    } finally {
      await Promise.all(pages.map((p) => p.close()));
    }
  });

  test('audio player stress test - rapid track switching', async ({ page }) => {
    await page.goto('/workspace/library');

    // Wait for tracks to load
    await page.waitForSelector('[data-testid="track-card"]', { timeout: 10000 });

    const tracks = page.locator('[data-testid="track-play-button"]');
    const trackCount = await tracks.count();

    if (trackCount < 3) {
      test.skip();
    }

    const startTime = Date.now();

    // Rapidly switch between tracks
    for (let i = 0; i < Math.min(trackCount, 10); i++) {
      await tracks.nth(i % trackCount).click();
      await page.waitForTimeout(500); // Short delay between switches
    }

    const duration = Date.now() - startTime;

    // Should handle rapid switching without crashes
    expect(duration).toBeLessThan(15000);

    // Player should still be functional
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
  });

  test('memory leak detection - extended usage', async ({ page }) => {
    await page.goto('/workspace/library');

    // Get initial memory usage
    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Simulate extended usage
    for (let i = 0; i < 20; i++) {
      // Navigate between pages
      await page.goto('/workspace/generate');
      await page.waitForTimeout(500);
      await page.goto('/workspace/library');
      await page.waitForTimeout(500);
    }

    // Get final memory usage
    const finalMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMetrics > 0 && finalMetrics > 0) {
      const memoryIncrease = finalMetrics - initialMetrics;
      const memoryIncreasePercent = (memoryIncrease / initialMetrics) * 100;

      // Memory increase should be < 50% after extended usage
      expect(memoryIncreasePercent).toBeLessThan(50);
    }
  });

  test('network throttling - 3G simulation', async ({ page, context }) => {
    // Simulate slow 3G connection
    await context.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
      await route.continue();
    });

    await page.goto('/workspace/generate');

    const startTime = Date.now();

    // Fill form and submit
    await page.fill('[data-testid="prompt-input"]', 'Test song');
    await page.click('[data-testid="generate-button"]');

    // Should show loading state immediately
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible({
      timeout: 2000,
    });

    const duration = Date.now() - startTime;

    // Should handle slow network gracefully (< 5s to show loading)
    expect(duration).toBeLessThan(5000);
  });

  test('offline recovery', async ({ page, context }) => {
    await page.goto('/workspace/library');

    // Go offline
    await context.setOffline(true);

    // Try to perform action
    await page.click('[data-testid="generate-nav"]').catch(() => {
      // Expected to fail
    });

    // Should show offline indicator
    await expect(page.locator('text=/offline|no connection/i')).toBeVisible({
      timeout: 3000,
    });

    // Go back online
    await context.setOffline(false);

    // Should recover automatically
    await page.waitForTimeout(2000);

    // Should be able to navigate now
    await page.click('[data-testid="generate-nav"]');
    await expect(page).toHaveURL(/\/workspace\/generate/);
  });

  test('bundle size validation', async ({ page }) => {
    // Navigate to app
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Get all JavaScript resources
    const jsResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources
        .filter((r) => r.name.endsWith('.js'))
        .map((r) => ({
          name: r.name,
          size: r.transferSize || r.encodedBodySize,
        }));
    });

    const totalSize = jsResources.reduce((sum, r) => sum + r.size, 0);
    const totalSizeKB = totalSize / 1024;

    console.log(`Total JS bundle size: ${totalSizeKB.toFixed(2)} KB`);

    // Total JS should be < 500KB (gzipped)
    expect(totalSizeKB).toBeLessThan(500);
  });

  test('Core Web Vitals - LCP', async ({ page }) => {
    await page.goto('/');

    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });

    console.log(`LCP: ${lcp}ms`);

    // LCP should be < 2.5s (good)
    expect(lcp).toBeLessThan(2500);
  });

  test('Core Web Vitals - FID', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');

    // Simulate user interaction
    const startTime = Date.now();
    await page.click('body');
    const fid = Date.now() - startTime;

    console.log(`FID: ${fid}ms`);

    // FID should be < 100ms (good)
    expect(fid).toBeLessThan(100);
  });
});
