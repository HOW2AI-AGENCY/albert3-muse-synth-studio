/**
 * E2E Test Helpers
 * Common utilities for Playwright tests
 */
import { Page, expect } from '@playwright/test';

/**
 * Wait for the page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
  const spinner = page.locator('[data-testid="full-page-spinner"]');
  if (await spinner.count()) {
    try {
      await spinner.first().waitFor({ state: 'detached', timeout: 10000 });
    } catch {
      // Ignore timeout - spinner may represent ongoing background loading
    }
  }
}

/**
 * Fill form field by label
 */
export async function fillByLabel(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value);
}

/**
 * Click button by text
 */
export async function clickButton(page: Page, text: string) {
  await page.getByRole('button', { name: text }).click();
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message: string) {
  await expect(page.getByText(message)).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, url: string) {
  await page.waitForURL(url, { timeout: 10000 });
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get element text content
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = await page.locator(selector);
  return (await element.textContent()) || '';
}

/**
 * Wait for API request to complete
 */
export async function waitForAPIRequest(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 30000 }
  );
}

/**
 * Mock Supabase Edge Function response
 */
export async function mockEdgeFunction(
  page: Page,
  functionName: string,
  response: any
) {
  await page.route(
    (url) => url.pathname.includes(`/functions/v1/${functionName}`),
    (route) => route.fulfill({ json: response })
  );
}

/**
 * Clear all cookies and local storage
 */
export async function clearBrowserData(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  await page.screenshot({ path: `tests/screenshots/${name}-${timestamp}.png` });
}
