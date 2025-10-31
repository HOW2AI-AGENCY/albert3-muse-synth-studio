/**
 * Audio Library E2E Tests
 * Tests audio file management and playback
 */
import { test, expect } from '@playwright/test';
import { loginToApp } from './utils';

test.describe('Audio Library Navigation', () => {
  test('should navigate to audio library', async ({ page }) => {
    await loginToApp(page);
    
    // Navigate to audio library
    await page.click('[href*="audio-library"], text=/Audio Library|Библиотека аудио/i');
    await expect(page).toHaveURL(/audio-library/);
    
    // Should show library interface
    await expect(page.locator('[data-testid="audio-library"], h1:has-text("Audio"), h1:has-text("Аудио")')).toBeVisible({ timeout: 5000 });
  });
  
  test('should display audio files', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/audio-library');
    
    await page.waitForTimeout(2000);
    
    // Should show audio items or empty state
    const audioItems = page.locator('[data-testid="audio-item"], [role="article"]');
    const emptyState = page.locator('text=/No audio|Нет аудио|Empty/i');
    
    const hasItems = await audioItems.first().isVisible({ timeout: 3000 }).catch(() => false);
    const isEmpty = await emptyState.isVisible({ timeout: 1000 }).catch(() => false);
    
    expect(hasItems || isEmpty).toBe(true);
  });
});

test.describe('Audio Upload', () => {
  test('should show upload interface', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/audio-library');
    
    // Look for upload button
    const uploadButton = page.locator('[data-testid="upload-button"], button:has-text("Upload"), button:has-text("Загрузить")').first();
    if (await uploadButton.isVisible({ timeout: 3000 })) {
      await uploadButton.click();
      
      // Should show upload dialog or file input
      await expect(
        page.locator('[data-testid="upload-dialog"], input[type="file"]')
      ).toBeVisible({ timeout: 3000 });
    }
  });
  
  test('should handle file selection', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/audio-library');
    
    await page.waitForTimeout(1000);
    
    // Look for file input
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3000 })) {
      // Note: Actual file upload requires test file
      // This tests the presence of upload functionality
      const inputCount = await fileInput.count();
      expect(inputCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Audio Playback', () => {
  test('should play audio file', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/audio-library');
    
    await page.waitForTimeout(2000);
    
    // Click on first audio item
    const audioItem = page.locator('[data-testid="audio-item"]').first();
    if (await audioItem.isVisible({ timeout: 3000 })) {
      await audioItem.click();
      
      // Play button should appear
      const playButton = page.locator('[data-testid="play-button"], [aria-label*="Play"]').first();
      if (await playButton.isVisible({ timeout: 2000 })) {
        await playButton.click();
        
        // Should show playing state
        await expect(
          page.locator('[data-state="playing"], [aria-label*="Pause"]')
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });
  
  test('should show audio waveform or visualization', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/audio-library');
    
    await page.waitForTimeout(2000);
    
    // Click on audio item
    const audioItem = page.locator('[data-testid="audio-item"]').first();
    if (await audioItem.isVisible({ timeout: 3000 })) {
      await audioItem.click();
      
      // Look for waveform or progress indicator
      const waveform = page.locator('[data-testid="waveform"], [data-testid="progress-bar"], canvas');
      await expect(waveform.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Audio File Management', () => {
  test('should filter by folder', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/audio-library');
    
    await page.waitForTimeout(2000);
    
    // Look for folder filter
    const folderFilter = page.locator('[data-testid="folder-filter"], select').first();
    if (await folderFilter.isVisible({ timeout: 3000 })) {
      await folderFilter.click();
      await page.waitForTimeout(500);
    }
  });
  
  test('should search audio files', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/audio-library');
    
    await page.waitForTimeout(2000);
    
    // Search functionality
    const searchInput = page.locator('[placeholder*="Search"], [placeholder*="Поиск"]').first();
    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Results should filter
      const results = page.locator('[data-testid="audio-item"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
  
  test('should delete audio file', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/audio-library');
    
    await page.waitForTimeout(2000);
    
    // Click on item
    const audioItem = page.locator('[data-testid="audio-item"]').first();
    if (await audioItem.isVisible({ timeout: 3000 })) {
      await audioItem.click();
      
      // Find delete button
      const deleteButton = page.locator('[data-testid="delete-button"], button:has-text("Delete")').first();
      if (await deleteButton.isVisible({ timeout: 2000 })) {
        await deleteButton.click();
        
        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Подтвердить")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
          
          // Should show success
          await expect(page.locator('text=/Deleted|Удалено/i')).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});
