/**
 * E2E Tests for Subscription System
 * @version 1.0.0
 */

import { test, expect } from '@playwright/test';

test.describe('Subscription System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and login
    await page.goto('/');
    // TODO: Add actual login flow when auth is implemented
    await page.goto('/workspace/generate');
  });

  test.describe('Feature Gating', () => {
    test('should show upgrade prompt for premium features on free plan', async ({ page }) => {
      // Try to access a premium feature
      await page.click('[data-testid="advanced-mode-toggle"]');

      // Should see upgrade prompt
      await expect(page.locator('text=Premium Feature')).toBeVisible();
      await expect(page.locator('text=Upgrade to')).toBeVisible();
    });

    test('should allow access to basic features on free plan', async ({ page }) => {
      // Basic prompt input should be accessible
      const promptInput = page.locator('textarea[placeholder*="Опишите музыку"]');
      await expect(promptInput).toBeEnabled();
      
      // Can type in prompt
      await promptInput.fill('Electronic dance music');
      await expect(promptInput).toHaveValue('Electronic dance music');
    });
  });

  test.describe('Generation Limits', () => {
    test('should block generation when daily limit is exceeded', async ({ page }) => {
      // Mock API to return exceeded limits
      await page.route('**/functions/v1/check-generation-limit', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            canGenerate: false,
            used: 3,
            limit: 3,
          }),
        });
      });

      // Try to generate
      await page.fill('textarea[placeholder*="Опишите музыку"]', 'Test prompt');
      await page.click('button:has-text("Создать")');

      // Should see limit exceeded message
      await expect(page.locator('text=/Лимит.*превышен/i')).toBeVisible();
    });

    test('should show remaining generations count', async ({ page }) => {
      // Mock API to return current limits
      await page.route('**/rest/v1/generation_limits*', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            generations_used_today: 1,
            generations_limit_daily: 3,
          }),
        });
      });

      await page.reload();

      // Should display remaining count
      await expect(page.locator('text=/2.*оставшихся/i')).toBeVisible();
    });

    test('should allow generation when under limit', async ({ page }) => {
      // Mock API to return available limits
      await page.route('**/functions/v1/check-generation-limit', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            canGenerate: true,
            used: 1,
            limit: 3,
          }),
        });
      });

      // Fill form and submit
      await page.fill('textarea[placeholder*="Опишите музыку"]', 'Upbeat electronic');
      await page.fill('input[placeholder*="Название"]', 'Test Track');

      // Generation button should be enabled
      const generateBtn = page.locator('button:has-text("Создать")');
      await expect(generateBtn).toBeEnabled();
    });
  });

  test.describe('Subscription Page', () => {
    test('should navigate to subscription page from profile menu', async ({ page }) => {
      // Open user menu
      await page.click('[data-testid="user-profile-dropdown"]');
      
      // Click subscription link
      await page.click('text=Подписка');

      // Should be on subscription page
      await expect(page).toHaveURL('/workspace/subscription');
    });

    test('should display available subscription plans', async ({ page }) => {
      await page.goto('/workspace/subscription');

      // Should show plan cards
      await expect(page.locator('text=Free')).toBeVisible();
      await expect(page.locator('text=Pro')).toBeVisible();
      await expect(page.locator('text=Studio')).toBeVisible();
      await expect(page.locator('text=Enterprise')).toBeVisible();
    });

    test('should highlight features of each plan', async ({ page }) => {
      await page.goto('/workspace/subscription');

      // Check Pro plan features
      const proPlan = page.locator('[data-plan="pro"]');
      await expect(proPlan.locator('text=/100.*кредитов/i')).toBeVisible();
      await expect(proPlan.locator('text=/AI.*контекст/i')).toBeVisible();

      // Check Studio plan features
      const studioPlan = page.locator('[data-plan="studio"]');
      await expect(studioPlan.locator('text=/500.*кредитов/i')).toBeVisible();
      await expect(studioPlan.locator('text=/Creative Director/i')).toBeVisible();
    });

    test('should show current plan badge', async ({ page }) => {
      await page.goto('/workspace/subscription');

      // Should have "Current Plan" badge on active plan
      await expect(page.locator('text=Текущий план')).toBeVisible();
    });
  });

  test.describe('Upgrade Flow', () => {
    test('should show upgrade button for higher tier plans', async ({ page }) => {
      await page.goto('/workspace/subscription');

      // Should see upgrade buttons
      const upgradeButtons = page.locator('button:has-text("Upgrade")');
      await expect(upgradeButtons).toHaveCount(3); // Pro, Studio, Enterprise
    });

    test('should navigate to upgrade from feature gate', async ({ page }) => {
      // Trigger feature gate
      await page.click('[data-testid="advanced-mode-toggle"]');

      // Click upgrade button in prompt
      await page.click('button:has-text(/Upgrade to/i)');

      // Should navigate to subscription page
      await expect(page).toHaveURL('/workspace/subscription');
    });
  });

  test.describe('AI Context Integration', () => {
    test('should show AI improvement buttons for Pro users', async ({ page }) => {
      // Mock user as Pro subscriber
      await page.route('**/rest/v1/subscription_plans*', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            name: 'pro',
            features: ['ai_context', 'reference_audio'],
          }),
        });
      });

      await page.reload();

      // AI improvement buttons should be visible
      await expect(page.locator('[data-testid="ai-improve-prompt"]')).toBeVisible();
    });

    test('should hide AI improvement buttons for Free users', async ({ page }) => {
      // Mock user as Free subscriber
      await page.route('**/rest/v1/subscription_plans*', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            name: 'free',
            features: [],
          }),
        });
      });

      await page.reload();

      // AI improvement buttons should not be visible
      await expect(page.locator('[data-testid="ai-improve-prompt"]')).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/workspace/subscription');

      // Plans should stack vertically
      const planCards = page.locator('[data-testid="plan-card"]');
      const firstCard = planCards.first();
      const secondCard = planCards.nth(1);

      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();

      expect(firstBox && secondBox).toBeTruthy();
      if (firstBox && secondBox) {
        // Second card should be below first card
        expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height);
      }
    });
  });

  test.describe('Analytics', () => {
    test('should track upgrade button clicks', async ({ page }) => {
      let analyticsEvent: any = null;

      // Intercept analytics events
      await page.route('**/rest/v1/analytics_events', (route) => {
        analyticsEvent = JSON.parse(route.request().postData() || '{}');
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/workspace/subscription');
      await page.click('button:has-text("Upgrade to PRO")');

      // Should track the event
      expect(analyticsEvent).toBeTruthy();
      expect(analyticsEvent.event_type).toBe('upgrade_click');
      expect(analyticsEvent.event_data.target_plan).toBe('pro');
    });
  });
});
