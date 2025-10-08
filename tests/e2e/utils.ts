import { expect, Locator, Page } from '@playwright/test';

const EMAIL_ENV_KEYS = ['E2E_EMAIL', 'PLAYWRIGHT_E2E_EMAIL', 'QA_EMAIL'];
const PASSWORD_ENV_KEYS = ['E2E_PASSWORD', 'PLAYWRIGHT_E2E_PASSWORD', 'QA_PASSWORD'];

function resolveEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function getTestCredentials() {
  const email = resolveEnv(EMAIL_ENV_KEYS);
  const password = resolveEnv(PASSWORD_ENV_KEYS);

  if (!email || !password) {
    throw new Error(
      'Missing E2E credentials. Set E2E_EMAIL and E2E_PASSWORD (or PLAYWRIGHT_E2E_EMAIL / PLAYWRIGHT_E2E_PASSWORD) before running tests.'
    );
  }

  return { email, password };
}

export async function loginToApp(page: Page) {
  const { email, password } = getTestCredentials();

  await page.context().clearCookies();
  await page.goto('/auth');

  if (page.url().includes('/workspace/')) {
    return;
  }

  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL('**/workspace/dashboard', { timeout: 20_000 });
}

export async function openLibrary(page: Page) {
  await loginToApp(page);
  await page.getByRole('button', { name: 'Библиотека' }).first().click();
  await page.waitForURL('**/workspace/library', { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Библиотека' })).toBeVisible();
}

export function libraryTrackCards(page: Page): Locator {
  return page.locator('[aria-label^="Трек"]');
}

export async function ensureLibraryReady(page: Page) {
  const cards = libraryTrackCards(page);
  await expect(cards.first()).toBeVisible();
  return cards;
}
