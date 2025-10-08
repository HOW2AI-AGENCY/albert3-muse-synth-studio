import { expect, test } from '@playwright/test';
import { ensureLibraryReady, libraryTrackCards, openLibrary } from './utils';

test.describe('Library interactions', () => {
  test.beforeEach(async ({ page }) => {
    await openLibrary(page);
    await ensureLibraryReady(page);
  });

  test('supports searching and status filtering', async ({ page }) => {
    const cards = libraryTrackCards(page);
    const firstCard = cards.first();
    const firstTitle = (await firstCard.locator('h3').first().innerText()).trim();
    const searchTerm = firstTitle.split(' ')[0] || firstTitle;

    const searchInput = page.getByLabel('Поиск треков');
    await searchInput.fill(searchTerm);

    const visibleCards = cards.filter({ has: page.locator('h3') });
    await expect(visibleCards.first()).toBeVisible();
    const visibleCount = await visibleCards.count();
    expect(visibleCount).toBeGreaterThan(0);

    for (let index = 0; index < visibleCount; index += 1) {
      const cardText = (await visibleCards.nth(index).innerText()).toLowerCase();
      expect(cardText).toContain(searchTerm.toLowerCase());
    }

    await searchInput.fill('');
    await searchInput.blur();
    await expect(cards.first()).toBeVisible();

    const statusSelect = page.getByLabel('Фильтр по статусу');
    await statusSelect.selectOption('completed');
    await expect(cards.first()).toBeVisible();

    await statusSelect.selectOption('all');
    await expect(cards.first()).toBeVisible();
  });

  test('sorts tracks by title in ascending order', async ({ page }) => {
    const cards = libraryTrackCards(page);
    const sortButton = page.getByRole('button', { name: /Название/ });

    await sortButton.click();
    await sortButton.click();

    const visibleCards = cards.filter({ has: page.locator('h3') });
    const count = await visibleCards.count();
    expect(count).toBeGreaterThan(1);

    const titles: string[] = [];
    for (let index = 0; index < count; index += 1) {
      titles.push((await visibleCards.nth(index).locator('h3').first().innerText()).trim());
    }

    const normalized = titles.map((title) => title.toLowerCase());
    const sorted = [...normalized].sort((a, b) => a.localeCompare(b, 'ru'));

    expect(normalized).toEqual(sorted);
  });

  test('switches between grid and list modes', async ({ page }) => {
    const cards = libraryTrackCards(page);
    await expect(cards.first()).toBeVisible();

    await page.getByRole('button', { name: 'Список' }).click();
    const listItems = page.locator('[data-testid^="track-list-item-"]');
    await expect(listItems.first()).toBeVisible();

    await page.getByRole('button', { name: 'Сетка' }).click();
    await expect(cards.first()).toBeVisible();

    await page.getByRole('button', { name: 'Оптимизированный список' }).click();
    await expect(listItems.first()).toBeVisible();
  });
});
