/**
 * Projects System E2E Tests
 * Week 1, Phase 1.1 - Project Management Flow Tests
 */
import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  fillByLabel,
  clickButton,
  waitForToast,
  waitForNavigation,
} from './helpers/test-helpers';
import { testUsers } from './fixtures/auth-fixtures';

// Helper to login
async function loginUser(page: any) {
  await page.goto('/auth');
  await fillByLabel(page, 'Email', testUsers.validUser.email);
  await fillByLabel(page, 'Password', testUsers.validUser.password);
  await clickButton(page, 'Sign In');
  await page.waitForURL(/\/workspace/);
}

test.describe('Projects System', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto('/workspace/projects');
    await waitForPageLoad(page);
  });

  test.describe('Manual Project Creation', () => {
    test('should create a new project manually', async ({ page }) => {
      // Click "Create Project" button
      await clickButton(page, /create project|создать проект/i);
      
      // Fill project details
      await fillByLabel(page, /project name|название проекта/i, 'My Test Album');
      await fillByLabel(page, /description|описание/i, 'A test album for E2E testing');
      await fillByLabel(page, /genre|жанр/i, 'Electronic');
      
      // Submit form
      await clickButton(page, /create|создать/i);
      
      // Wait for success message
      await waitForToast(page, /project created|проект создан/i);
      
      // Verify project appears in list
      await expect(page.getByText('My Test Album')).toBeVisible();
    });

    test('should show validation error for empty name', async ({ page }) => {
      // Click "Create Project" button
      await clickButton(page, /create project|создать проект/i);
      
      // Try to submit without filling name
      await clickButton(page, /create|создать/i);
      
      // Check for validation message
      const nameInput = page.getByLabel(/project name|название проекта/i);
      await expect(nameInput).toHaveAttribute('required');
    });
  });

  test.describe('AI-Assisted Project Creation', () => {
    test('should create project with AI assistant', async ({ page }) => {
      // Click "Create with AI" button
      await clickButton(page, /create with ai|создать с ai/i);
      
      // Fill AI prompt
      const promptInput = page.getByPlaceholder(/describe your project|опишите проект/i);
      await promptInput.fill('Create a chillwave album with dreamy synths and nostalgic vibes');
      
      // Click generate
      await clickButton(page, /generate|создать/i);
      
      // Wait for AI to generate concept (may take a few seconds)
      await expect(page.getByText(/generating concept|генерация концепции/i)).toBeVisible();
      
      // Wait for results (timeout 20s for AI)
      await expect(page.getByText(/project name|название проекта/i)).toBeVisible({ timeout: 20000 });
      
      // Verify AI-generated fields are populated
      const nameInput = page.getByLabel(/project name|название проекта/i);
      const nameValue = await nameInput.inputValue();
      expect(nameValue.length).toBeGreaterThan(0);
      
      // Verify tracklist is shown
      await expect(page.getByText(/planned tracks|запланированные треки/i)).toBeVisible();
      
      // Accept and create project
      await clickButton(page, /create project|создать проект/i);
      
      // Wait for success
      await waitForToast(page, /project created|проект создан/i);
    });
  });

  test.describe('Adding Tracks to Project', () => {
    test('should add generated track to project', async ({ page }) => {
      // Navigate to generator
      await page.goto('/workspace/generate');
      await waitForPageLoad(page);
      
      // Select a project from dropdown
      const projectSelector = page.getByRole('combobox', { name: /select project|выбрать проект/i });
      await projectSelector.click();
      
      // Select first project
      await page.getByRole('option').first().click();
      
      // Generate a track
      await page.getByPlaceholder(/describe the music|опишите музыку/i)
        .fill('Test track for project');
      await clickButton(page, /generate|создать/i);
      
      // Wait for generation to start
      await waitForToast(page, /generation started|генерация началась/i);
      
      // Navigate back to projects
      await page.goto('/workspace/projects');
      await waitForPageLoad(page);
      
      // Verify track count increased (may need to wait for real-time update)
      // This is a placeholder - actual verification depends on UI implementation
      await expect(page.getByText(/1 track|1 трек/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Project Statistics', () => {
    test('should display correct project statistics', async ({ page }) => {
      // Click on a project to view details
      const projectCard = page.getByRole('article').first();
      await projectCard.click();
      
      // Verify statistics are displayed
      await expect(page.getByText(/tracks|треков/i)).toBeVisible();
      await expect(page.getByText(/total duration|общая длительность/i)).toBeVisible();
      await expect(page.getByText(/created|создан/i)).toBeVisible();
    });

    test('should auto-update track count when track is added', async ({ page }) => {
      // Get initial track count
      const projectCard = page.getByRole('article').first();
      const initialCountText = await projectCard.getByText(/\d+ track/i).textContent();
      
      // Navigate to generator and add track to this project
      await page.goto('/workspace/generate');
      await waitForPageLoad(page);
      
      // Select the project
      const projectSelector = page.getByRole('combobox', { name: /select project|выбрать проект/i });
      await projectSelector.click();
      await page.getByRole('option').first().click();
      
      // Generate track
      await page.getByPlaceholder(/describe the music|опишите музыку/i)
        .fill('Another test track');
      await clickButton(page, /generate|создать/i);
      
      // Go back to projects
      await page.goto('/workspace/projects');
      await waitForPageLoad(page);
      
      // Verify count increased
      const updatedCard = page.getByRole('article').first();
      const updatedCountText = await updatedCard.getByText(/\d+ track/i).textContent();
      
      expect(updatedCountText).not.toBe(initialCountText);
    });
  });

  test.describe('Project Deletion', () => {
    test('should delete a project', async ({ page }) => {
      // Find a project card
      const projectCard = page.getByRole('article').first();
      const projectName = await projectCard.getByRole('heading').textContent();
      
      // Open context menu or click delete button
      await projectCard.hover();
      await clickButton(page, /delete|удалить/i);
      
      // Confirm deletion
      await clickButton(page, /confirm|подтвердить/i);
      
      // Wait for success message
      await waitForToast(page, /project deleted|проект удален/i);
      
      // Verify project is removed from list
      await expect(page.getByText(projectName || '')).not.toBeVisible();
    });
  });
});
