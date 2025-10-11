import { test, expect } from '@playwright/test';

test.describe('Upload & Extend Audio', () => {
  test.beforeEach(async ({ page }) => {
    // Note: Login helper should be implemented
    // await login(page);
    await page.goto('/workspace/upload-audio');
  });

  test.skip('should display upload audio page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Загрузка аудио');
  });

  test.skip('should upload and extend audio file', async ({ page }) => {
    await page.click('text=Расширить аудио');
    await page.click('text=Загрузить и расширить');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-assets/sample-audio.mp3');
    
    // Fill form
    await page.fill('input[placeholder*="название"]', 'Extended Test Track');
    await page.fill('input[placeholder*="Стиль"]', 'Electronic');
    
    await page.click('button:has-text("Расширить аудио")');
    
    // Should show success
    await expect(page.locator('text=Обработка начата')).toBeVisible({ timeout: 5000 });
  });

  test.skip('should add instrumental to vocal track', async ({ page }) => {
    await page.click('[data-tab="instrumental"]');
    await page.click('text=Создать инструментал');
    
    // Upload vocal file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-assets/vocal-sample.mp3');
    
    // Fill form
    await page.fill('input[placeholder*="название"]', 'Instrumental Test Track');
    await page.fill('input[placeholder*="Теги"]', 'rock, energetic');
    
    await page.click('button:has-text("Создать инструментал")');
    
    // Should show success
    await expect(page.locator('text=Обработка начата')).toBeVisible({ timeout: 5000 });
  });

  test.skip('should add vocal to instrumental track', async ({ page }) => {
    // Navigate to library
    await page.goto('/workspace/library');
    
    // Find an instrumental track
    const instrumentalTrack = page.locator('[data-track-type="instrumental"]').first();
    
    // Open context menu
    await instrumentalTrack.click({ button: 'right' });
    
    // Click "Add Vocal"
    await page.click('text=Добавить вокал');
    
    // Fill vocal dialog
    await page.fill('textarea[placeholder*="текст"]', 'Sample vocal text');
    await page.fill('input[placeholder*="стиль"]', 'pop');
    
    await page.click('button:has-text("Добавить вокал")');
    
    // Should show success
    await expect(page.locator('text=Добавление вокала начато')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Track Type Indicators', () => {
  test.beforeEach(async ({ page }) => {
    // await login(page);
    await page.goto('/workspace/library');
  });

  test.skip('should show vocal icon for tracks with vocals', async ({ page }) => {
    const vocalTrack = page.locator('[data-track-type="vocal"]').first();
    const micIcon = vocalTrack.locator('svg[data-icon="mic"]');
    
    await expect(micIcon).toBeVisible();
  });

  test.skip('should show instrumental icon for tracks without vocals', async ({ page }) => {
    const instrumentalTrack = page.locator('[data-track-type="instrumental"]').first();
    const musicIcon = instrumentalTrack.locator('svg[data-icon="music"]');
    
    await expect(musicIcon).toBeVisible();
  });

  test.skip('should show tooltip on hover', async ({ page }) => {
    const track = page.locator('[data-track]').first();
    const icon = track.locator('svg').first();
    
    await icon.hover();
    
    // Should show tooltip
    await expect(page.locator('text=/С вокалом|Инструментал/')).toBeVisible({ timeout: 2000 });
  });
});
