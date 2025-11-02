/**
 * Authentication E2E Tests
 * Week 1, Phase 1.1 - Authentication Flow Tests
 */
import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  fillByLabel,
  clickButton,
  waitForToast,
  waitForNavigation,
  clearBrowserData,
} from './helpers/test-helpers';
import { testUsers, authErrorMessages, authRoutes } from './fixtures/auth-fixtures';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser data before each test
    await clearBrowserData(page);
    
    // Navigate to auth page
    await page.goto(authRoutes.login);
    await waitForPageLoad(page);
  });

  test.describe('User Login', () => {
    test('should successfully log in with valid credentials', async ({ page }) => {
      // Fill login form
      await fillByLabel(page, 'Email', testUsers.validUser.email);
      await fillByLabel(page, 'Password', testUsers.validUser.password);
      
      // Submit form
      await clickButton(page, 'Sign In');
      
      // Wait for navigation to workspace
      await waitForNavigation(page, authRoutes.workspace);
      
      // Verify we're on the workspace page
      await expect(page).toHaveURL(new RegExp(authRoutes.workspace));
      
      // Verify user is logged in (check for logout button or user menu)
      await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      // Fill login form with invalid credentials
      await fillByLabel(page, 'Email', testUsers.invalidUser.email);
      await fillByLabel(page, 'Password', testUsers.invalidUser.password);
      
      // Submit form
      await clickButton(page, 'Sign In');
      
      // Wait for error toast or message
      await waitForToast(page, authErrorMessages.invalidCredentials);
      
      // Verify we're still on auth page
      await expect(page).toHaveURL(new RegExp(authRoutes.login));
    });

    test('should show validation error for empty fields', async ({ page }) => {
      // Try to submit without filling fields
      await clickButton(page, 'Sign In');
      
      // Check for validation messages
      const emailInput = page.getByLabel('Email');
      const passwordInput = page.getByLabel('Password');
      
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });
  });

  test.describe('User Signup', () => {
    test('should successfully sign up a new user', async ({ page }) => {
      // Switch to signup mode (if there's a tab/button)
      const signupButton = page.getByRole('button', { name: /sign up|create account/i });
      if (await signupButton.isVisible()) {
        await signupButton.click();
      }
      
      // Fill signup form
      await fillByLabel(page, 'Email', testUsers.newUser.email);
      await fillByLabel(page, 'Password', testUsers.newUser.password);
      
      // Submit form
      await clickButton(page, /Sign Up|Create Account/i);
      
      // Wait for success message or navigation
      await waitForNavigation(page, authRoutes.workspace);
      
      // Verify user is logged in
      await expect(page).toHaveURL(new RegExp(authRoutes.workspace));
    });

    test('should show error when email is already taken', async ({ page }) => {
      // Switch to signup mode
      const signupButton = page.getByRole('button', { name: /sign up|create account/i });
      if (await signupButton.isVisible()) {
        await signupButton.click();
      }
      
      // Try to sign up with existing email
      await fillByLabel(page, 'Email', testUsers.validUser.email);
      await fillByLabel(page, 'Password', testUsers.validUser.password);
      
      // Submit form
      await clickButton(page, /Sign Up|Create Account/i);
      
      // Wait for error message
      await waitForToast(page, authErrorMessages.emailTaken);
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session after page reload', async ({ page }) => {
      // Login first
      await fillByLabel(page, 'Email', testUsers.validUser.email);
      await fillByLabel(page, 'Password', testUsers.validUser.password);
      await clickButton(page, 'Sign In');
      await waitForNavigation(page, authRoutes.workspace);
      
      // Reload page
      await page.reload();
      await waitForPageLoad(page);
      
      // Verify user is still logged in
      await expect(page).toHaveURL(new RegExp(authRoutes.workspace));
      await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeVisible();
    });

    test('should redirect to auth page after logout', async ({ page }) => {
      // Login first
      await fillByLabel(page, 'Email', testUsers.validUser.email);
      await fillByLabel(page, 'Password', testUsers.validUser.password);
      await clickButton(page, 'Sign In');
      await waitForNavigation(page, authRoutes.workspace);
      
      // Logout
      await clickButton(page, /logout|sign out/i);
      
      // Wait for redirect to auth page
      await waitForNavigation(page, authRoutes.login);
      
      // Verify we're on auth page
      await expect(page).toHaveURL(new RegExp(authRoutes.login));
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true);
      
      // Try to login
      await fillByLabel(page, 'Email', testUsers.validUser.email);
      await fillByLabel(page, 'Password', testUsers.validUser.password);
      await clickButton(page, 'Sign In');
      
      // Wait for network error message
      await expect(page.getByText(/network error|connection failed/i)).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
    });
  });
});
