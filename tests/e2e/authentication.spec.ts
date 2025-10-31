/**
 * Authentication Flow E2E Tests
 * Tests user authentication and session management
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should sign in with valid credentials', async ({ page }) => {
    await page.goto('/');
    
    const email = process.env.E2E_EMAIL || '';
    const password = process.env.E2E_PASSWORD || '';
    
    if (!email || !password) {
      test.skip();
      return;
    }
    
    // Fill sign-in form
    await page.fill('[data-testid="email-input"], input[type="email"]', email);
    await page.fill('[data-testid="password-input"], input[type="password"]', password);
    
    // Submit
    await page.click('[data-testid="sign-in-button"], button:has-text("Sign in"), button:has-text("Войти")');
    
    // Should redirect to dashboard/workspace
    await expect(page).toHaveURL(/\/(workspace|dashboard)/, { timeout: 10000 });
    
    // Should show user interface elements
    await expect(page.locator('[data-testid="user-menu"], [aria-label*="user"]')).toBeVisible({ timeout: 5000 });
  });
  
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('[data-testid="email-input"], input[type="email"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"], input[type="password"]', 'wrongpassword');
    
    await page.click('[data-testid="sign-in-button"], button:has-text("Sign in")');
    
    // Should show error message
    await expect(page.locator('text=/Invalid|Неверный|Error|Ошибка/i')).toBeVisible({ timeout: 5000 });
  });
  
  test('should persist session after page reload', async ({ page }) => {
    const email = process.env.E2E_EMAIL || '';
    const password = process.env.E2E_PASSWORD || '';
    
    if (!email || !password) {
      test.skip();
      return;
    }
    
    // Sign in
    await page.goto('/');
    await page.fill('[type="email"]', email);
    await page.fill('[type="password"]', password);
    await page.click('button:has-text("Sign in"), button:has-text("Войти")');
    
    await expect(page).toHaveURL(/workspace/, { timeout: 10000 });
    
    // Reload page
    await page.reload();
    
    // Should still be signed in
    await expect(page).toHaveURL(/workspace/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 5000 });
  });
  
  test('should sign out successfully', async ({ page }) => {
    const email = process.env.E2E_EMAIL || '';
    const password = process.env.E2E_PASSWORD || '';
    
    if (!email || !password) {
      test.skip();
      return;
    }
    
    // Sign in first
    await page.goto('/');
    await page.fill('[type="email"]', email);
    await page.fill('[type="password"]', password);
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL(/workspace/, { timeout: 10000 });
    
    // Open user menu
    await page.click('[data-testid="user-menu"], [aria-label*="user menu"]');
    
    // Click sign out
    await page.click('text=/Sign out|Выйти/i');
    
    // Should redirect to auth page
    await expect(page).toHaveURL(/\/(auth|login)?$/, { timeout: 5000 });
  });
});
