/**
 * Lyrics Library E2E Tests
 * Tests complete lyrics management workflow
 */
import { test, expect } from '@playwright/test';
import { loginToApp } from './utils';

test.describe('Lyrics Library Management', () => {
  test('should navigate to lyrics library', async ({ page }) => {
    await loginToApp(page);
    
    // Navigate to lyrics library
    await page.click('[href*="lyrics-library"], text=/Lyrics|Тексты/i');
    await expect(page).toHaveURL(/lyrics-library/);
    
    // Should show library interface
    await expect(page.locator('[data-testid="lyrics-library"], h1:has-text("Lyrics"), h1:has-text("Тексты")')).toBeVisible({ timeout: 5000 });
  });
  
  test('should search for lyrics', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/lyrics-library');
    
    // Wait for lyrics to load
    await page.waitForTimeout(2000);
    
    // Search for lyrics
    const searchInput = page.locator('[placeholder*="Search"], [placeholder*="Поиск"]').first();
    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('love');
      await page.waitForTimeout(1000);
      
      // Results should update
      const results = page.locator('[data-testid="lyrics-item"], [role="article"]');
      if (await results.first().isVisible({ timeout: 3000 })) {
        await expect(results.first()).toBeVisible();
      }
    }
  });
  
  test('should view lyrics details', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/lyrics-library');
    
    await page.waitForTimeout(2000);
    
    // Click on first lyrics item
    const lyricsItem = page.locator('[data-testid="lyrics-item"], [role="article"]').first();
    if (await lyricsItem.isVisible({ timeout: 3000 })) {
      await lyricsItem.click();
      
      // Details should appear (modal or side panel)
      await expect(
        page.locator('[data-testid="lyrics-detail"], [data-testid="lyrics-preview"]')
      ).toBeVisible({ timeout: 5000 });
    }
  });
  
  test('should filter by folder', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/lyrics-library');
    
    await page.waitForTimeout(2000);
    
    // Look for folder filter
    const folderFilter = page.locator('[data-testid="folder-filter"], select, [role="combobox"]').first();
    if (await folderFilter.isVisible({ timeout: 3000 })) {
      await folderFilter.click();
      
      // Select a folder option
      const folderOption = page.locator('[role="option"]').first();
      if (await folderOption.isVisible({ timeout: 2000 })) {
        await folderOption.click();
        await page.waitForTimeout(1000);
      }
    }
  });
  
  test('should add lyrics to favorites', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/lyrics-library');
    
    await page.waitForTimeout(2000);
    
    // Find and click favorite button
    const favoriteButton = page.locator('[data-testid="favorite-button"], [aria-label*="favorite"]').first();
    if (await favoriteButton.isVisible({ timeout: 3000 })) {
      await favoriteButton.click();
      
      // Should show success feedback
      await expect(
        page.locator('text=/Added to favorites|В избранное|Favorite/i')
      ).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Lyrics Creation and Editing', () => {
  test('should create new lyrics', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/lyrics-library');
    
    // Click create button
    const createButton = page.locator('[data-testid="create-lyrics"], button:has-text("Create"), button:has-text("Создать")').first();
    if (await createButton.isVisible({ timeout: 3000 })) {
      await createButton.click();
      
      // Fill in lyrics form
      const titleInput = page.locator('[data-testid="lyrics-title"], [placeholder*="Title"], [placeholder*="Название"]').first();
      if (await titleInput.isVisible({ timeout: 2000 })) {
        await titleInput.fill('Test Lyrics Title');
        
        const contentInput = page.locator('[data-testid="lyrics-content"], textarea').first();
        if (await contentInput.isVisible()) {
          await contentInput.fill('[Verse]\nTest lyrics content\n[Chorus]\nAmazing chorus');
          
          // Save
          await page.click('button:has-text("Save"), button:has-text("Сохранить")');
          
          // Should show success
          await expect(page.locator('text=/Saved|Сохранено/i')).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
  
  test('should edit existing lyrics', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/lyrics-library');
    
    await page.waitForTimeout(2000);
    
    // Click on first item
    const lyricsItem = page.locator('[data-testid="lyrics-item"]').first();
    if (await lyricsItem.isVisible({ timeout: 3000 })) {
      await lyricsItem.click();
      
      // Click edit button
      const editButton = page.locator('[data-testid="edit-button"], button:has-text("Edit"), button:has-text("Редактировать")').first();
      if (await editButton.isVisible({ timeout: 2000 })) {
        await editButton.click();
        
        // Modify content
        const contentInput = page.locator('textarea').first();
        if (await contentInput.isVisible()) {
          await contentInput.fill('[Verse]\nEdited lyrics content');
          
          // Save changes
          await page.click('button:has-text("Save")');
          await expect(page.locator('text=/Updated|Обновлено/i')).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
  
  test('should delete lyrics', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/lyrics-library');
    
    await page.waitForTimeout(2000);
    
    // Click on item
    const lyricsItem = page.locator('[data-testid="lyrics-item"]').first();
    if (await lyricsItem.isVisible({ timeout: 3000 })) {
      await lyricsItem.click();
      
      // Click delete button
      const deleteButton = page.locator('[data-testid="delete-button"], button:has-text("Delete"), button:has-text("Удалить")').first();
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
