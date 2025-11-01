/**
 * Music Generation E2E Tests
 * Week 1, Phase 1.1 - Music Generation Flow Tests
 */
import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  fillByLabel,
  clickButton,
  waitForToast,
  waitForAPIRequest,
  mockEdgeFunction,
} from './helpers/test-helpers';
import { testUsers } from './fixtures/auth-fixtures';

// Helper to login before generation tests
async function loginUser(page: any) {
  await page.goto('/auth');
  await fillByLabel(page, 'Email', testUsers.validUser.email);
  await fillByLabel(page, 'Password', testUsers.validUser.password);
  await clickButton(page, 'Sign In');
  await page.waitForURL(/\/workspace\/generate/);
}

test.describe('Music Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page);
    await waitForPageLoad(page);
  });

  test.describe('Suno AI Generation', () => {
    test('should generate music in Simple Mode', async ({ page }) => {
      // Ensure Suno provider is selected
      const sunoButton = page.getByRole('button', { name: /suno/i });
      if (await sunoButton.isVisible()) {
        await sunoButton.click();
      }
      
      // Fill prompt
      const promptInput = page.getByPlaceholder(/describe the music|опишите музыку/i);
      await promptInput.fill('Upbeat electronic dance music with energetic synths');
      
      // Click generate button
      await clickButton(page, /generate|создать/i);
      
      // Wait for generation to start
      await waitForToast(page, /generation started|генерация началась/i);
      
      // Wait for API request to complete
      await waitForAPIRequest(page, '/functions/v1/generate-suno');
      
      // Verify track appears in library or status indicator
      await expect(page.getByText(/processing|в процессе/i)).toBeVisible({ timeout: 10000 });
    });

    test('should generate music in Custom Mode', async ({ page }) => {
      // Switch to Custom Mode
      const customModeButton = page.getByRole('button', { name: /custom mode|кастомный режим/i });
      if (await customModeButton.isVisible()) {
        await customModeButton.click();
      }
      
      // Fill custom mode fields
      await fillByLabel(page, /title|название/i, 'Neon Nights');
      await fillByLabel(page, /tags|стили/i, 'edm, energetic, synth');
      
      const lyricsTextarea = page.getByPlaceholder(/lyrics|текст песни/i);
      await lyricsTextarea.fill('[Verse]\nDancing through the neon lights\n[Chorus]\nFeel the rhythm tonight');
      
      // Click generate
      await clickButton(page, /generate|создать/i);
      
      // Wait for generation
      await waitForToast(page, /generation started|генерация началась/i);
      await waitForAPIRequest(page, '/functions/v1/generate-suno');
      
      // Verify processing status
      await expect(page.getByText(/processing|в процессе/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Mureka AI Generation', () => {
    test('should generate music with Mureka provider', async ({ page }) => {
      // Switch to Mureka provider
      const murekaButton = page.getByRole('button', { name: /mureka/i });
      await murekaButton.click();
      
      // Fill prompt
      const promptInput = page.getByPlaceholder(/describe the music|опишите музыку/i);
      await promptInput.fill('Calm ambient soundscape with nature elements');
      
      // Click generate
      await clickButton(page, /generate|создать/i);
      
      // Wait for generation
      await waitForToast(page, /generation started|генерация началась/i);
      await waitForAPIRequest(page, '/functions/v1/generate-mureka');
      
      // Verify processing status
      await expect(page.getByText(/processing|в процессе/i)).toBeVisible({ timeout: 10000 });
    });

    test('should handle lyrics selection dialog', async ({ page }) => {
      // Switch to Mureka
      await page.getByRole('button', { name: /mureka/i }).click();
      
      // Mock Mureka response with multiple lyrics variants
      await mockEdgeFunction(page, 'generate-mureka', {
        requiresLyricsSelection: true,
        variants: [
          { title: 'Variant 1', content: 'Lyrics 1...' },
          { title: 'Variant 2', content: 'Lyrics 2...' },
        ],
      });
      
      // Fill prompt
      await page.getByPlaceholder(/describe the music|опишите музыку/i)
        .fill('A song about summer');
      
      // Click generate
      await clickButton(page, /generate|создать/i);
      
      // Wait for lyrics selection dialog
      await expect(page.getByText(/select lyrics|выберите текст/i)).toBeVisible({ timeout: 5000 });
      
      // Select first variant
      await page.getByRole('button', { name: /variant 1/i }).click();
      
      // Confirm selection
      await clickButton(page, /confirm|подтвердить/i);
      
      // Verify generation continues
      await waitForToast(page, /generation started|генерация началась/i);
    });
  });

  test.describe('AI Project Creation', () => {
    test('should generate project concept with AI', async ({ page }) => {
      // Navigate to Projects page
      await page.goto('/workspace/projects');
      await waitForPageLoad(page);
      
      // Click "Create with AI" button
      await clickButton(page, /create with ai|создать с ai/i);
      
      // Fill AI prompt
      const aiPromptInput = page.getByPlaceholder(/describe your project|опишите проект/i);
      await aiPromptInput.fill('Create a synthwave album inspired by 80s nostalgia');
      
      // Click generate
      await clickButton(page, /generate concept|создать концепцию/i);
      
      // Wait for AI generation
      await waitForAPIRequest(page, '/functions/v1/generate-project-concept');
      
      // Wait for results
      await expect(page.getByText(/project concept|концепция проекта/i)).toBeVisible({ timeout: 15000 });
      
      // Verify tracklist is shown
      await expect(page.getByText(/planned tracks|запланированные треки/i)).toBeVisible();
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle rate limit errors', async ({ page }) => {
      // Mock rate limit error
      await page.route('**/functions/v1/generate-suno', (route) =>
        route.fulfill({
          status: 429,
          json: { error: 'Rate limit exceeded' },
        })
      );
      
      // Try to generate
      await page.getByPlaceholder(/describe the music|опишите музыку/i)
        .fill('Test music');
      await clickButton(page, /generate|создать/i);
      
      // Verify error message
      await waitForToast(page, /rate limit|слишком много запросов/i);
    });

    test('should handle insufficient credits error', async ({ page }) => {
      // Mock insufficient credits error
      await page.route('**/functions/v1/generate-suno', (route) =>
        route.fulfill({
          status: 402,
          json: { error: 'Insufficient credits' },
        })
      );
      
      // Try to generate
      await page.getByPlaceholder(/describe the music|опишите музыку/i)
        .fill('Test music');
      await clickButton(page, /generate|создать/i);
      
      // Verify error message
      await waitForToast(page, /insufficient credits|недостаточно кредитов/i);
    });

    test('should handle network errors', async ({ page }) => {
      // Simulate network failure
      await page.context().setOffline(true);
      
      // Try to generate
      await page.getByPlaceholder(/describe the music|опишите музыку/i)
        .fill('Test music');
      await clickButton(page, /generate|создать/i);
      
      // Verify error message
      await expect(page.getByText(/network error|ошибка сети/i)).toBeVisible();
      
      // Restore network
      await page.context().setOffline(false);
    });
  });

  test.describe('Track Status Polling', () => {
    test('should update track status in real-time', async ({ page }) => {
      // Start generation
      await page.getByPlaceholder(/describe the music|опишите музыку/i)
        .fill('Test track for status polling');
      await clickButton(page, /generate|создать/i);
      
      // Wait for initial status
      await expect(page.getByText(/processing|в процессе/i)).toBeVisible({ timeout: 10000 });
      
      // Mock status update (in real scenario, Supabase Realtime would handle this)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('track-status-update', {
          detail: { status: 'completed', audioUrl: 'https://example.com/audio.mp3' }
        }));
      });
      
      // Verify status changed to completed
      await expect(page.getByText(/completed|завершено/i)).toBeVisible({ timeout: 5000 });
    });
  });
});
