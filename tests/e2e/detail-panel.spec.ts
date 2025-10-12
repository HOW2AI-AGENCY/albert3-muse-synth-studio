import { test, expect } from '@playwright/test';
import { loginToApp } from './utils';

test.describe('Track Details Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');
    await page.waitForLoadState('networkidle');
  });

  test('should display compact hero section', async ({ page }) => {
    // Wait for tracks to load
    const firstTrack = page.locator('[aria-label*="Трек"]').first();
    await firstTrack.waitFor({ state: 'visible', timeout: 10000 });
    
    // Click on first track to open detail panel
    await firstTrack.click();
    
    // Wait for detail panel to open
    await page.waitForTimeout(500);
    
    // Check CompactTrackHero components are visible
    await expect(page.getByRole('img', { name: /Обложка/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Открыть в плеере/i })).toBeVisible();
  });

  test('should show structured lyrics in Details tab', async ({ page }) => {
    const firstTrack = page.locator('[aria-label*="Трек"]').first();
    await firstTrack.waitFor({ state: 'visible', timeout: 10000 });
    await firstTrack.click();
    
    // Switch to Details tab
    await page.getByRole('tab', { name: /Детали/i }).click();
    
    // Check for structured lyrics sections
    const lyricsSection = page.locator('.space-y-4').first();
    await expect(lyricsSection).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    const firstTrack = page.locator('[aria-label*="Трек"]').first();
    await firstTrack.waitFor({ state: 'visible', timeout: 10000 });
    await firstTrack.click();
    
    // Switch to Versions tab
    await page.getByRole('tab', { name: /Версии/i }).click();
    await page.waitForTimeout(300);
    
    // Switch to Stems tab
    await page.getByRole('tab', { name: /Стемы/i }).click();
    await page.waitForTimeout(300);
    
    // Switch back to Overview
    await page.getByRole('tab', { name: /Обзор/i }).click();
    await page.waitForTimeout(300);
    
    // Verify we're on Overview tab
    await expect(page.getByText(/Технические детали/i)).toBeVisible();
  });

  test('should scroll detail panel content', async ({ page }) => {
    const firstTrack = page.locator('[aria-label*="Трек"]').first();
    await firstTrack.waitFor({ state: 'visible', timeout: 10000 });
    await firstTrack.click();
    
    // Find scroll container
    const scrollContainer = page.locator('[data-testid="detail-panel-scroll"]');
    await scrollContainer.waitFor({ state: 'visible', timeout: 5000 });
    
    // Scroll down
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    
    await page.waitForTimeout(300);
    
    // Verify technical details are visible after scroll
    await expect(page.getByText(/Технические детали/i)).toBeVisible();
  });

  test('should open player when clicking "Открыть в плеере" button', async ({ page }) => {
    const firstTrack = page.locator('[aria-label*="Трек"]').first();
    await firstTrack.waitFor({ state: 'visible', timeout: 10000 });
    await firstTrack.click();
    
    // Click "Открыть в плеере" button
    const openPlayerButton = page.getByRole('button', { name: /Открыть в плеере/i });
    await openPlayerButton.click();
    
    // Wait for player to appear
    await page.waitForTimeout(500);
    
    // Verify player is visible (check for audio element or player controls)
    const audioElement = page.locator('audio').first();
    await expect(audioElement).toBeVisible();
  });

  test('should display like count and toggle like', async ({ page }) => {
    const firstTrack = page.locator('[aria-label*="Трек"]').first();
    await firstTrack.waitFor({ state: 'visible', timeout: 10000 });
    await firstTrack.click();
    
    // Find like button in hero section
    const likeButton = page.getByRole('button').filter({ has: page.locator('svg[class*="heart"]') }).first();
    
    if (await likeButton.isVisible()) {
      // Get initial like count
      const initialLikeText = await likeButton.textContent();
      
      // Click like button
      await likeButton.click();
      await page.waitForTimeout(500);
      
      // Verify like count changed or button state changed
      const newLikeText = await likeButton.textContent();
      expect(newLikeText).not.toBe(initialLikeText);
    }
  });
});
