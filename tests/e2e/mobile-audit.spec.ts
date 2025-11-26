import { test, expect } from '@playwright/test';

test.describe('Mobile Interface Audit', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 Pro

  test('should navigate correctly and interact with mobile components', async ({ page }) => {
    await page.goto('/auth');

    // Login
    await page.getByLabel('Электронная почта').fill('e2e-user@test.com');
    await page.getByLabel('Пароль').fill('password123');
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL('/workspace/dashboard');

    // 1. Check if the bottom navigation bar is visible
    const bottomNav = page.locator('[data-bottom-tab-bar="true"]');
    await expect(bottomNav).toBeVisible();

    // 2. Navigate to the Library via the corrected link
    const libraryButton = bottomNav.locator('button[aria-label="Библиотека"]');
    await libraryButton.click();
    await page.waitForURL('/workspace/library');
    await expect(page).toHaveURL('/workspace/library');

    // 3. Open the "Generate" sheet
    const generateButton = bottomNav.locator('button[aria-label="Создать"]');
    await generateButton.click();

    // 4. Verify the sheet is open
    const sheetTitle = page.locator('h2.sheet-title', { hasText: 'Создать трек' });
    await expect(sheetTitle).toBeVisible();
  });
});
