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

  test('starts playback from the master version selected in the detail panel', async ({ page }) => {
    const cards = libraryTrackCards(page);
    const totalCards = await cards.count();
    let targetTitle: string | null = null;

    for (let index = 0; index < totalCards; index += 1) {
      const card = cards.nth(index);
      await card.scrollIntoViewIfNeeded();
      await card.click();
      await expect(page.getByTitle(/Пауза/)).toBeVisible();

      const versionsButton = page.getByTitle(/версий$/);
      if (!(await versionsButton.isVisible())) {
        continue;
      }

      await versionsButton.click();
      const menuItems = page.locator('[role="menuitem"]');
      const optionCount = await menuItems.count();
      await page.keyboard.press('Escape');

      if (optionCount > 1) {
        targetTitle = (await card.locator('h3').first().innerText()).trim();
        break;
      }
    }

    expect(targetTitle).not.toBeNull();

    await page.getByRole('button', { name: 'Генерация' }).first().click();
    await page.waitForURL('**/workspace/generate', { timeout: 15000 });

    const targetListItem = page
      .locator('[data-testid^="track-list-item-"]')
      .filter({ hasText: targetTitle! })
      .first();
    await targetListItem.scrollIntoViewIfNeeded();
    await targetListItem.click();

    const detailPanel = page.getByRole('complementary', { name: 'Панель деталей трека' });
    await expect(detailPanel).toBeVisible();

    const versionsTrigger = detailPanel.getByRole('button', { name: /Версии/ });
    await versionsTrigger.click();

    const makeMasterButtons = detailPanel.locator('button', { hasText: 'Сделать главной' });
    await expect(makeMasterButtons.first()).toBeVisible({ timeout: 15000 });
    const buttonsCount = await makeMasterButtons.count();

    let selectedVersionNumber: number | null = null;
    for (let index = 0; index < buttonsCount; index += 1) {
      const button = makeMasterButtons.nth(index);
      const versionLabel = await button.evaluate((el) => {
        const container = el.closest('div.flex');
        const label = container?.querySelector('span.font-medium');
        return label?.textContent ?? '';
      });
      const match = versionLabel?.match(/Версия\s+(\d+)/);
      if (!match) {
        continue;
      }

      selectedVersionNumber = Number(match[1]);
      await button.click();

      await expect(
        detailPanel.locator('div').filter({ hasText: `Версия ${selectedVersionNumber}` }).locator('text=Главная')
      ).toBeVisible({ timeout: 15000 });
      break;
    }

    expect(selectedVersionNumber).not.toBeNull();

    await page.getByRole('button', { name: 'Библиотека' }).first().click();
    await page.waitForURL('**/workspace/library', { timeout: 15000 });
    await ensureLibraryReady(page);

    const refreshButton = page.getByRole('button', { name: 'Обновить список треков' });
    await refreshButton.click();

    const targetCard = libraryTrackCards(page).filter({ hasText: targetTitle! }).first();
    await targetCard.scrollIntoViewIfNeeded();
    await targetCard.click();
    await expect(page.getByTitle(/Пауза/)).toBeVisible();

    const queueButton = page.locator('button').filter({ has: page.locator('svg[data-lucide="list-music"]') }).first();
    await queueButton.click();

    const queuePanel = page.locator('[role="dialog"]').filter({ hasText: 'Очередь' });
    await expect(queuePanel).toBeVisible();

    const queueItems = queuePanel.locator('div').filter({ has: page.locator('svg[data-lucide="x"]') });
    const firstQueueItem = queueItems.first();
    await expect(firstQueueItem).toContainText(`V${selectedVersionNumber}`);
    await expect(firstQueueItem.locator('svg[data-lucide="star"]')).toBeVisible();

    await page.keyboard.press('Escape');
  });
});
