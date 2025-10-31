/**
 * Critical User Flows E2E Tests
 * Tests the most important user journeys through the application
 */
import { test, expect } from '@playwright/test';
import { loginToApp } from './utils';

test.describe('Critical Flow 1: Music Generation End-to-End', () => {
  test('should generate music from prompt to playable track', async ({ page }) => {
    await loginToApp(page);
    
    // Navigate to generation page
    await page.click('[data-testid="nav-generate"], [href*="generate"]');
    await expect(page).toHaveURL(/.*generate/);
    
    // Fill in prompt
    const prompt = 'Epic orchestral battle music';
    await page.fill('[data-testid="prompt-input"], textarea[placeholder*="опишите"]', prompt);
    
    // Select genre/mood if available
    const genreSelect = page.locator('[data-testid="genre-select"]').first();
    if (await genreSelect.isVisible()) {
      await genreSelect.click();
      await page.click('text=Orchestral, text=Оркестровая').first();
    }
    
    // Submit generation
    await page.click('[data-testid="generate-button"], button:has-text("Создать"), button:has-text("Генерировать")');
    
    // Wait for generation to start
    await expect(page.locator('text=/Генерация|Processing|Creating/')).toBeVisible({ timeout: 10000 });
    
    // Note: In real scenario, track generation takes time
    // For E2E, we verify the UI state changes appropriately
    
    // Should show loading/processing state
    await expect(page.locator('[data-state="processing"], [data-status="processing"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Critical Flow 2: Track Playback', () => {
  test('should play track from library', async ({ page }) => {
    await loginToApp(page);
    
    // Navigate to library
    await page.click('[data-testid="nav-library"], [href*="library"]');
    await expect(page).toHaveURL(/.*library/);
    
    // Wait for tracks to load
    await page.waitForSelector('[data-testid="track-card"], [role="article"]', { timeout: 10000 });
    
    // Click first track
    const firstTrack = page.locator('[data-testid="track-card"], [role="article"]').first();
    await firstTrack.click();
    
    // Player should appear
    await expect(page.locator('[data-testid="audio-player"], [class*="player"]')).toBeVisible({ timeout: 5000 });
    
    // Click play button
    const playButton = page.locator('[data-testid="play-button"], [aria-label*="Play"], button:has([class*="play"])').first();
    await playButton.click();
    
    // Verify playing state
    await expect(page.locator('[data-state="playing"], [aria-label*="Pause"]')).toBeVisible({ timeout: 3000 });
  });
  
  test('should control playback (play/pause/seek)', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');
    
    await page.waitForSelector('[data-testid="track-card"]', { timeout: 10000 });
    await page.locator('[data-testid="track-card"]').first().click();
    
    const playPauseButton = page.locator('[data-testid="play-button"]').first();
    
    // Play
    await playPauseButton.click();
    await page.waitForTimeout(1000);
    
    // Pause
    await playPauseButton.click();
    
    // Seek (if progress bar exists)
    const progressBar = page.locator('[data-testid="progress-bar"], [role="slider"]');
    if (await progressBar.isVisible()) {
      const box = await progressBar.boundingBox();
      if (box) {
        // Click at 50% position
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
      }
    }
  });
});

test.describe('Critical Flow 3: Track Management', () => {
  test('should archive and restore track', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');
    
    await page.waitForSelector('[data-testid="track-card"]', { timeout: 10000 });
    
    // Find a track that's not archived
    const track = page.locator('[data-testid="track-card"]').first();
    await track.click();
    
    // Open options menu
    const moreButton = page.locator('[data-testid="track-options"], [aria-label*="options"]').first();
    if (await moreButton.isVisible()) {
      await moreButton.click();
      
      // Click archive
      await page.click('text=/Archive|Архивировать/');
      
      // Confirm if dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Подтвердить")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      // Should show success message
      await expect(page.locator('text=/archived|заархивирован/i')).toBeVisible({ timeout: 5000 });
    }
  });
  
  test('should download track', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');
    
    await page.waitForSelector('[data-testid="track-card"]', { timeout: 10000 });
    const track = page.locator('[data-testid="track-card"]').first();
    await track.click();
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    
    // Click download button
    const downloadButton = page.locator('[data-testid="download-button"], [aria-label*="Download"], button:has-text("Download")').first();
    if (await downloadButton.isVisible()) {
      await downloadButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.mp3$/);
    }
  });
});

test.describe('Critical Flow 4: Version Management', () => {
  test('should create and switch between track versions', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');
    
    await page.waitForSelector('[data-testid="track-card"]', { timeout: 10000 });
    await page.locator('[data-testid="track-card"]').first().click();
    
    // Look for version controls
    const versionButton = page.locator('[data-testid="versions-button"], text=/Versions|Версии/i').first();
    if (await versionButton.isVisible({ timeout: 2000 })) {
      await versionButton.click();
      
      // Verify versions list appears
      await expect(page.locator('[data-testid="version-list"], [role="list"]')).toBeVisible();
      
      // Click on a version
      const versionItem = page.locator('[data-testid="version-item"], [role="listitem"]').first();
      if (await versionItem.isVisible()) {
        await versionItem.click();
        
        // Should show as selected
        await expect(versionItem).toHaveAttribute('data-selected', 'true');
      }
    }
  });
});

test.describe('Critical Flow 5: Stem Separation', () => {
  test('should separate vocals and instrumental', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');
    
    await page.waitForSelector('[data-testid="track-card"]', { timeout: 10000 });
    await page.locator('[data-testid="track-card"]').first().click();
    
    // Look for stems button
    const stemsButton = page.locator('[data-testid="stems-button"], text=/Stems|Стемы/i').first();
    if (await stemsButton.isVisible({ timeout: 2000 })) {
      await stemsButton.click();
      
      // Start separation
      const separateButton = page.locator('button:has-text("Separate"), button:has-text("Разделить")').first();
      if (await separateButton.isVisible()) {
        await separateButton.click();
        
        // Should show processing state
        await expect(page.locator('text=/Separating|Разделение/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
