import { test, expect } from '@playwright/test';
import { loginToApp } from './utils';

const extractCount = async (locator: import('@playwright/test').Locator) => {
  const text = (await locator.innerText()).trim();
  const numeric = text.replace(/[^\d]/g, '');
  return Number(numeric || '0');
};

test.describe('Analytics counters', () => {
  test('increment after viewing a track detail panel', async ({ page }) => {
    await loginToApp(page);

    await page.goto('/workspace/analytics');
    await page.waitForSelector('[data-testid="analytics-total-views"]');

    const viewsLocator = page.getByTestId('analytics-total-views');
    const playsLocator = page.getByTestId('analytics-total-plays');

    const initialViews = await extractCount(viewsLocator);
    const initialPlays = await extractCount(playsLocator);

    await page.goto('/workspace/generate');

    const firstTrackCard = page.locator('[aria-label^="Трек"]').first();
    await expect(firstTrackCard).toBeVisible();
    await firstTrackCard.click();

    await expect(page.getByRole('button', { name: 'Статистика' })).toBeVisible();
    await page.waitForTimeout(500);

    await page.goto('/workspace/analytics');
    await page.waitForSelector('[data-testid="analytics-total-views"]');

    await expect
      .poll(async () => extractCount(page.getByTestId('analytics-total-views')), {
        timeout: 10_000,
      })
      .toBeGreaterThan(initialViews);

    await expect
      .poll(async () => extractCount(page.getByTestId('analytics-total-plays')), {
        timeout: 10_000,
      })
      .toBeGreaterThan(initialPlays);
  });
});
