/**
 * E2E Tests: Provider Switching (Suno ↔ Mureka)
 * TEST-003: Provider-specific behaviors
 */
import { test, expect } from '@playwright/test';

test.describe('Provider Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace/generate');
  });

  test('should switch between Suno and Mureka providers', async ({ page }) => {
    // Default should be Suno
    await expect(page.getByRole('button', { name: /Suno/i, pressed: true })).toBeVisible();
    
    // Switch to Mureka
    await page.getByRole('button', { name: /Mureka/i }).click();
    await expect(page.getByRole('button', { name: /Mureka/i, pressed: true })).toBeVisible();
    
    // Switch back to Suno
    await page.getByRole('button', { name: /Suno/i }).click();
    await expect(page.getByRole('button', { name: /Suno/i, pressed: true })).toBeVisible();
  });

  test('should show BGM mode for Mureka only', async ({ page }) => {
    // Suno: no BGM toggle
    await page.getByRole('button', { name: /Suno/i }).click();
    await expect(page.getByLabel(/BGM.*Фоновая музыка/i)).not.toBeVisible();
    
    // Mureka: BGM toggle visible
    await page.getByRole('button', { name: /Mureka/i }).click();
    await expect(page.getByLabel(/BGM.*Фоновая музыка/i)).toBeVisible();
  });

  test('should hide Extend and Cover buttons for Mureka tracks', async ({ page }) => {
    await page.goto('/workspace/library');
    
    // Find Mureka track (provider = 'mureka')
    const murekaTrack = page.locator('[role="article"]').filter({ hasText: /Mureka/i }).first();
    
    if (await murekaTrack.count() > 0) {
      // Open menu
      await murekaTrack.locator('button[aria-label*="Menu"]').click();
      
      // Extend and Cover should not be available
      await expect(page.getByRole('menuitem', { name: /Продлить|Extend/i })).not.toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Кавер|Cover/i })).not.toBeVisible();
    }
  });

  test('should show Song Recognition for Mureka only', async ({ page }) => {
    await page.goto('/workspace/generate');
    
    // Switch to Mureka
    await page.getByRole('button', { name: /Mureka/i }).click();
    
    // Check if Mureka-specific features are visible
    await expect(page.getByText(/Распознавание песни|Song Recognition/i)).toBeVisible();
  });
});
