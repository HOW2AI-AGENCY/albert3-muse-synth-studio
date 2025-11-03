/**
 * E2E Tests: Audio Player Flows
 * TEST-004: Audio Player E2E Tests (4h)
 */
import { test, expect } from '@playwright/test';

test.describe('Audio Player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace/library');
  });

  test('should play track on card click', async ({ page }) => {
    // Wait for tracks to load
    await page.waitForSelector('[role="article"]', { timeout: 10000 });
    
    // Click first track
    await page.locator('[role="article"]').first().click();
    
    // Expect player to appear
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible({ timeout: 5000 });
    
    // Expect play button to show pause icon
    await expect(page.getByRole('button', { name: /Pause|Пауза/i })).toBeVisible({ timeout: 3000 });
  });

  test('should pause and resume playback', async ({ page }) => {
    await page.waitForSelector('[role="article"]');
    await page.locator('[role="article"]').first().click();
    
    // Wait for player
    await page.waitForSelector('[data-testid="audio-player"]', { timeout: 5000 });
    
    // Click pause
    await page.getByRole('button', { name: /Pause/i }).click();
    
    // Expect play button
    await expect(page.getByRole('button', { name: /Play|Воспроизвести/i })).toBeVisible({ timeout: 2000 });
    
    // Click play again
    await page.getByRole('button', { name: /Play/i }).click();
    
    // Expect pause button
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible({ timeout: 2000 });
  });

  test('should navigate to next track', async ({ page }) => {
    await page.waitForSelector('[role="article"]');
    
    // Get first two track titles
    const firstTrackTitle = await page.locator('[role="article"]').first().locator('h3').textContent();
    const secondTrackTitle = await page.locator('[role="article"]').nth(1).locator('h3').textContent();
    
    // Play first track
    await page.locator('[role="article"]').first().click();
    await page.waitForSelector('[data-testid="audio-player"]');
    
    // Click next button
    await page.getByRole('button', { name: /Next|Следующий/i }).click();
    
    // Expect second track title in player
    await expect(page.locator('[data-testid="audio-player"]')).toContainText(secondTrackTitle || '');
  });

  test('should switch between track versions', async ({ page }) => {
    await page.waitForSelector('[role="article"]');
    
    // Find track with versions
    const trackWithVersions = page.locator('[role="article"]').filter({ hasText: /v1|v2|Variant/i }).first();
    
    if (await trackWithVersions.count() > 0) {
      // Click track
      await trackWithVersions.click();
      
      // Open versions menu
      await page.getByRole('button', { name: /Версии|Versions/i }).click();
      
      // Select variant
      await page.getByRole('menuitem', { name: /Variant|v2/i }).first().click();
      
      // Expect player to update
      await expect(page.locator('[data-testid="audio-player"]')).toContainText(/v2|Variant/i, { timeout: 3000 });
    }
  });

  test('should add track to queue', async ({ page }) => {
    await page.waitForSelector('[role="article"]');
    
    // Play first track
    await page.locator('[role="article"]').first().click();
    await page.waitForSelector('[data-testid="audio-player"]');
    
    // Open menu on second track
    await page.locator('[role="article"]').nth(1).locator('button[aria-label*="Menu"]').click();
    
    // Click "Add to queue"
    await page.getByRole('menuitem', { name: /В очередь|Add to queue/i }).click();
    
    // Expect success toast
    await expect(page.locator('text=/Добавлено в очередь|Added to queue/i')).toBeVisible({ timeout: 3000 });
  });

  test('should use keyboard shortcuts', async ({ page }) => {
    await page.waitForSelector('[role="article"]');
    await page.locator('[role="article"]').first().click();
    await page.waitForSelector('[data-testid="audio-player"]');
    
    // Press Space to pause
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /Play/i })).toBeVisible({ timeout: 2000 });
    
    // Press Space to play
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible({ timeout: 2000 });
    
    // Press M to mute
    await page.keyboard.press('m');
    
    // Press L to like (if implemented)
    await page.keyboard.press('l');
  });

  test('should seek through track', async ({ page }) => {
    await page.waitForSelector('[role="article"]');
    await page.locator('[role="article"]').first().click();
    await page.waitForSelector('[data-testid="audio-player"]');
    
    // Get progress bar
    const progressBar = page.locator('input[type="range"][aria-label*="Progress"]');
    
    // Seek to 50%
    await progressBar.fill('50');
    
    // Expect current time to update
    await expect(page.locator('[data-testid="current-time"]')).not.toHaveText('0:00');
  });
});
