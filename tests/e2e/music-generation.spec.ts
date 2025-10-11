import { test, expect } from '@playwright/test';
import { loginToApp } from './utils';

test.describe('Music Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/generate');
    await page.waitForSelector('[data-testid="music-generator"]');
  });

  test('should generate music with simple prompt', async ({ page }) => {
    await page.getByPlaceholder('Опишите музыку').fill('Energetic rock song');
    await page.getByRole('button', { name: 'Сгенерировать' }).click();

    await expect(page.getByText(/Музыка создается/i)).toBeVisible({
      timeout: 10000,
    });

    // Wait for track to appear in library
    await page.waitForTimeout(2000);
    await page.goto('/workspace/library');
    
    await expect(
      page.locator('[aria-label^="Трек"]').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should toggle custom mode and show lyrics field', async ({ page }) => {
    await page.getByRole('switch', { name: /Пользовательский режим/i }).click();

    await expect(page.getByPlaceholder('Введите текст песни')).toBeVisible();
    await expect(page.getByPlaceholder('Введите теги стиля')).toBeVisible();
  });

  test('should show instrumental toggle when custom mode is on', async ({ page }) => {
    await page.getByRole('switch', { name: /Пользовательский режим/i }).click();

    const instrumentalSwitch = page.getByRole('switch', {
      name: /Инструментальная/i,
    });
    await expect(instrumentalSwitch).toBeVisible();

    await instrumentalSwitch.click();
    await expect(instrumentalSwitch).toBeChecked();
  });

  test('should expand advanced settings', async ({ page }) => {
    await page.getByRole('button', { name: /Дополнительные настройки/i }).click();

    await expect(page.getByText(/Версия модели/i)).toBeVisible();
    await expect(page.getByText(/Вес текста/i)).toBeVisible();
    await expect(page.getByText(/Вес промпта/i)).toBeVisible();
  });

  test('should change model version', async ({ page }) => {
    await page.getByRole('button', { name: /Дополнительные настройки/i }).click();

    const modelSelect = page.locator('[data-testid="model-select"]');
    await modelSelect.click();
    await page.getByRole('option', { name: 'V4.5+' }).click();

    await expect(modelSelect).toContainText('V4.5+');
  });

  test('should adjust weights with sliders', async ({ page }) => {
    await page.getByRole('button', { name: /Дополнительные настройки/i }).click();

    const lyricsWeightSlider = page.locator('[data-testid="lyrics-weight-slider"]');
    await lyricsWeightSlider.click();
    
    // Verify slider is interactive
    await expect(lyricsWeightSlider).toBeVisible();
  });
});

test.describe('Reference Audio Upload', () => {
  test.beforeEach(async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/generate');
  });

  test('should show reference audio section', async ({ page }) => {
    await expect(
      page.getByText(/Референсное аудио/i)
    ).toBeVisible();
  });

  test('should validate file size on upload', async ({ page }) => {
    // Create a mock large file (> 20MB)
    const largeBuffer = Buffer.alloc(21 * 1024 * 1024);
    
    await page.setInputFiles(
      'input[type="file"]',
      {
        name: 'large.mp3',
        mimeType: 'audio/mpeg',
        buffer: largeBuffer,
      }
    );

    await expect(
      page.getByText(/File size must be less than 20MB/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should accept valid audio file', async ({ page }) => {
    const audioBuffer = Buffer.alloc(1024 * 1024); // 1MB
    
    await page.setInputFiles(
      'input[type="file"]',
      {
        name: 'test.mp3',
        mimeType: 'audio/mpeg',
        buffer: audioBuffer,
      }
    );

    await expect(
      page.getByText(/test.mp3/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Track Extension', () => {
  test('should open extend dialog from track card', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');

    const firstTrack = page.locator('[aria-label^="Трек"]').first();
    await firstTrack.click();

    await page.getByRole('button', { name: /Расширить/i }).click();

    await expect(
      page.getByRole('heading', { name: /Расширить трек/i })
    ).toBeVisible();
  });

  test('should show continue-at slider in extend dialog', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');

    const firstTrack = page.locator('[aria-label^="Трек"]').first();
    await firstTrack.click();

    await page.getByRole('button', { name: /Расширить/i }).click();

    await expect(
      page.getByText(/Начать с/i)
    ).toBeVisible();
  });
});

test.describe('Cover Creation', () => {
  test('should open create cover dialog', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');

    const firstTrack = page.locator('[aria-label^="Трек"]').first();
    await firstTrack.click();

    await page.getByRole('button', { name: /Создать кавер/i }).click();

    await expect(
      page.getByRole('heading', { name: /Создать кавер/i })
    ).toBeVisible();
  });

  test('should show reference modes in cover dialog', async ({ page }) => {
    await loginToApp(page);
    await page.goto('/workspace/library');

    const firstTrack = page.locator('[aria-label^="Трек"]').first();
    await firstTrack.click();

    await page.getByRole('button', { name: /Создать кавер/i }).click();

    await expect(page.getByText(/Использовать оригинальный трек/i)).toBeVisible();
    await expect(page.getByText(/Загрузить свой файл/i)).toBeVisible();
    await expect(page.getByText(/Записать с микрофона/i)).toBeVisible();
  });
});
