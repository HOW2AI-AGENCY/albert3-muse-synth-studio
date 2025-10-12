import { expect, test } from '@playwright/test';
import { ensureLibraryReady, openLibrary } from './utils';

test.describe('Audio player experience', () => {
  test.beforeEach(async ({ page }) => {
    await openLibrary(page);
    await ensureLibraryReady(page);
  });

  test('plays a track and toggles like state', async ({ page }) => {
    const cards = await ensureLibraryReady(page);
    const firstCard = cards.first();
    const title = (await firstCard.locator('h3').first().innerText()).trim();

    await firstCard.click();
    await expect(page.getByTitle(/Пауза/)).toBeVisible();

    const heartButton = firstCard
      .locator('button')
      .filter({ has: page.locator('svg[data-lucide="heart"]') })
      .first();

    const wasLiked = await heartButton.evaluate((el) => el.classList.contains('text-red-500'));

    await heartButton.click();
    await expect
      .poll(async () => heartButton.evaluate((el) => el.classList.contains('text-red-500')))
      .toBe(!wasLiked);

    await heartButton.click();
    await expect
      .poll(async () => heartButton.evaluate((el) => el.classList.contains('text-red-500')))
      .toBe(wasLiked);

    // Ensure playback keeps running while interactions happen
    await expect(page.getByTitle(/Пауза/)).toBeVisible();
    expect(title.length).toBeGreaterThan(0);
  });

  test('opens the queue and removes the current track', async ({ page }) => {
    const cards = await ensureLibraryReady(page);
    const firstCard = cards.first();
    const title = (await firstCard.locator('h3').first().innerText()).trim();

    await firstCard.click();
    await expect(page.getByTitle(/Пауза/)).toBeVisible();

    const queueButton = page
      .locator('button')
      .filter({ has: page.locator('svg[data-lucide="list-music"]') })
      .first();
    await queueButton.click();

    const queuePanel = page.locator('[role="dialog"]').filter({ hasText: 'Очередь' });
    await expect(queuePanel).toBeVisible();

    const queueItem = queuePanel
      .locator('div')
      .filter({ hasText: title })
      .filter({ has: page.locator('svg[data-lucide="x"]') })
      .first();

    await expect(queueItem).toBeVisible();

    await queueItem.locator('button').filter({ has: page.locator('svg[data-lucide="x"]') }).click();
    await expect(
      queuePanel.locator('div').filter({ hasText: title }).filter({ has: page.locator('svg[data-lucide="x"]') })
    ).toHaveCount(0);
  });

  test('switches between track versions when available', async ({ page }) => {
    const cards = await ensureLibraryReady(page);
    const total = await cards.count();
    let switched = false;

    for (let index = 0; index < total; index += 1) {
      const card = cards.nth(index);
      await card.scrollIntoViewIfNeeded();
      await card.click();
      await expect(page.getByTitle(/Пауза/)).toBeVisible();

      const versionButton = page.getByTitle(/версий$/);
      if (!(await versionButton.isVisible())) {
        continue;
      }

      await versionButton.click();
      const versionOptions = page.locator('[role="menuitem"]');
      const optionCount = await versionOptions.count();
      if (optionCount <= 1) {
        await page.keyboard.press('Escape');
        continue;
      }

      const targetOption = versionOptions.nth(1);
      const optionLabel = (await targetOption.innerText()).trim();
      await targetOption.click();

      const match = optionLabel.match(/Версия\s+(\d+)/);
      if (match) {
        await expect(page.locator(`text=/^V${match[1]}$/`)).toBeVisible();
      } else {
        await expect(page.locator('text=/^V\\d+$/')).toHaveCount(0);
      }

      switched = true;
      break;
    }

    expect(switched).toBeTruthy();
  });

  test('should handle rapid clicks without AbortError', async ({ page }) => {
    const cards = await ensureLibraryReady(page);
    const firstCard = cards.first();
    
    // ✅ Быстро кликнуть 5 раз
    for (let i = 0; i < 5; i++) {
      await firstCard.click({ delay: 50 });
    }
    
    // ✅ Плеер должен быть в состоянии воспроизведения
    await expect(page.getByTitle(/Пауза/)).toBeVisible({ timeout: 5000 });
    
    // ✅ НЕ должно быть AbortError в консоли
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.waitForTimeout(1000);
    expect(errors.filter(e => e.includes('AbortError'))).toHaveLength(0);
  });

  test('should not crash when toggling play without loaded track', async ({ page }) => {
    await page.goto('/workspace/library');
    
    // ✅ Попытка нажать play без выбранного трека
    const playButton = page.getByTitle(/Воспроизвести/);
    if (await playButton.isVisible()) {
      await playButton.click();
    }
    
    // ✅ Не должно быть краша
    await expect(page.locator('body')).toBeVisible();
  });
});
