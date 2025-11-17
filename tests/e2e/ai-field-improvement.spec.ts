/**
 * E2E Tests for AI Field Improvement
 * @version 1.0.0
 */

import { test, expect } from '@playwright/test';

test.describe('AI Field Improvement', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Pro subscription for AI features
    await page.route('**/rest/v1/subscription_plans*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          name: 'pro',
          display_name: 'Pro',
          features: ['ai_context', 'reference_audio', 'stems'],
        }),
      });
    });

    await page.goto('/workspace/generate');
  });

  test.describe('Prompt Improvement', () => {
    test('should improve prompt with AI', async ({ page }) => {
      // Mock AI improvement response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            result: 'Upbeat electronic dance music with energetic synths and driving bassline',
            action: 'improve',
            field: 'prompt',
          }),
        });
      });

      // Enter initial prompt
      const promptInput = page.locator('textarea[placeholder*="Опишите музыку"]');
      await promptInput.fill('electronic music');

      // Click AI improve button
      await page.click('[data-testid="ai-improve-prompt"]');
      await page.click('text=✨ Улучшить');

      // Wait for improvement
      await expect(page.locator('text=Обработка')).toBeVisible();
      await expect(page.locator('text=Обработка')).not.toBeVisible({ timeout: 10000 });

      // Should show success message
      await expect(page.locator('text=/Промпт улучшен/i')).toBeVisible();

      // Prompt should be updated
      await expect(promptInput).toHaveValue(/energetic synths/);
    });

    test('should generate new prompt from scratch', async ({ page }) => {
      // Mock AI generation response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            result: 'Atmospheric ambient soundscape with ethereal pads and subtle textures',
            action: 'generate',
            field: 'prompt',
          }),
        });
      });

      // Click AI improve button without entering prompt
      await page.click('[data-testid="ai-improve-prompt"]');
      await page.click('text=🎯 Сгенерировать');

      // Wait for generation
      await expect(page.locator('text=Обработка')).toBeVisible();
      await expect(page.locator('text=Обработка')).not.toBeVisible({ timeout: 10000 });

      // Prompt should be filled
      const promptInput = page.locator('textarea[placeholder*="Опишите музыку"]');
      await expect(promptInput).toHaveValue(/Atmospheric ambient/);
    });

    test('should rewrite prompt in different style', async ({ page }) => {
      // Mock AI rewrite response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            result: 'Heavy metal track with aggressive guitars and pounding drums',
            action: 'rewrite',
            field: 'prompt',
          }),
        });
      });

      // Enter initial prompt
      const promptInput = page.locator('textarea[placeholder*="Опишите музыку"]');
      await promptInput.fill('soft piano music');

      // Click AI improve button and rewrite
      await page.click('[data-testid="ai-improve-prompt"]');
      await page.click('text=🔄 Переписать');

      // Wait for rewrite
      await expect(page.locator('text=Обработка')).toBeVisible();
      await expect(page.locator('text=Обработка')).not.toBeVisible({ timeout: 10000 });

      // Prompt should be completely different
      await expect(promptInput).toHaveValue(/Heavy metal/);
    });
  });

  test.describe('Lyrics Improvement', () => {
    test('should improve lyrics with AI', async ({ page }) => {
      // Switch to custom mode
      await page.click('text=Кастомный режим');

      // Mock AI improvement response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            result: '[Verse]\nUnder neon skies so bright\nDancing through the endless night\n\n[Chorus]\nFeel the rhythm, feel the beat\nMoving bodies, feel the heat',
            action: 'improve',
            field: 'lyrics',
          }),
        });
      });

      // Enter basic lyrics
      const lyricsInput = page.locator('textarea[placeholder*="Текст песни"]');
      await lyricsInput.fill('Dancing in the night\nFeeling so right');

      // Click AI improve button for lyrics
      await page.click('[data-testid="ai-improve-lyrics"]');
      await page.click('text=✨ Улучшить');

      // Wait for improvement
      await expect(page.locator('text=Обработка')).toBeVisible();
      await expect(page.locator('text=Обработка')).not.toBeVisible({ timeout: 10000 });

      // Lyrics should be improved with structure
      await expect(lyricsInput).toHaveValue(/\[Verse\]/);
      await expect(lyricsInput).toHaveValue(/\[Chorus\]/);
    });

    test('should generate lyrics from prompt', async ({ page }) => {
      // Switch to custom mode
      await page.click('text=Кастомный режим');

      // Mock AI generation response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            result: '[Verse 1]\nLost in the city lights\nSearching for what feels right\n\n[Chorus]\nWe are alive tonight\nShining so bright',
            action: 'generate',
            field: 'lyrics',
          }),
        });
      });

      // Click AI generate button for lyrics
      await page.click('[data-testid="ai-improve-lyrics"]');
      await page.click('text=🎯 Сгенерировать');

      // Wait for generation
      await expect(page.locator('text=Обработка')).toBeVisible();
      await expect(page.locator('text=Обработка')).not.toBeVisible({ timeout: 10000 });

      // Lyrics should be generated
      const lyricsInput = page.locator('textarea[placeholder*="Текст песни"]');
      await expect(lyricsInput).toHaveValue(/Lost in the city/);
    });
  });

  test.describe('Title Improvement', () => {
    test('should improve title with AI', async ({ page }) => {
      // Switch to custom mode
      await page.click('text=Кастомный режим');

      // Mock AI improvement response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            result: 'Neon Dreams: A Journey Through Electric Nights',
            action: 'improve',
            field: 'title',
          }),
        });
      });

      // Enter basic title
      const titleInput = page.locator('input[placeholder*="Название"]');
      await titleInput.fill('Night Music');

      // Click AI improve button for title
      await page.click('[data-testid="ai-improve-title"]');
      await page.click('text=✨ Улучшить');

      // Wait for improvement
      await expect(page.locator('text=Обработка')).toBeVisible();
      await expect(page.locator('text=Обработка')).not.toBeVisible({ timeout: 10000 });

      // Title should be improved
      await expect(titleInput).toHaveValue(/Neon Dreams/);
    });

    test('should generate title from context', async ({ page }) => {
      // Switch to custom mode
      await page.click('text=Кастомный режим');

      // Fill prompt for context
      await page.fill('textarea[placeholder*="Опишите музыку"]', 'Epic orchestral music');

      // Mock AI generation response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            result: 'Symphony of Heroes',
            action: 'generate',
            field: 'title',
          }),
        });
      });

      // Click AI generate button for title
      await page.click('[data-testid="ai-improve-title"]');
      await page.click('text=🎯 Сгенерировать');

      // Wait for generation
      await expect(page.locator('text=Обработка')).toBeVisible();
      await expect(page.locator('text=Обработка')).not.toBeVisible({ timeout: 10000 });

      // Title should be generated
      const titleInput = page.locator('input[placeholder*="Название"]');
      await expect(titleInput).toHaveValue(/Symphony of Heroes/);
    });
  });

  test.describe('Error Handling', () => {
    test('should show error message on API failure', async ({ page }) => {
      // Mock AI failure response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            success: false,
            error: 'AI service temporarily unavailable',
          }),
        });
      });

      // Try to improve prompt
      const promptInput = page.locator('textarea[placeholder*="Опишите музыку"]');
      await promptInput.fill('test');
      await page.click('[data-testid="ai-improve-prompt"]');
      await page.click('text=✨ Улучшить');

      // Should show error message
      await expect(page.locator('text=/Ошибка.*AI/i')).toBeVisible();
    });

    test('should handle empty field validation', async ({ page }) => {
      // Try to improve empty field
      await page.click('[data-testid="ai-improve-prompt"]');
      await page.click('text=✨ Улучшить');

      // Should show validation message
      await expect(page.locator('text=/Поле.*пустое/i')).toBeVisible();
    });

    test('should handle rate limiting', async ({ page }) => {
      // Mock rate limit response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        route.fulfill({
          status: 429,
          body: JSON.stringify({
            success: false,
            error: 'Rate limit exceeded',
          }),
        });
      });

      // Try to improve prompt
      const promptInput = page.locator('textarea[placeholder*="Опишите музыку"]');
      await promptInput.fill('test');
      await page.click('[data-testid="ai-improve-prompt"]');
      await page.click('text=✨ Улучшить');

      // Should show rate limit message
      await expect(page.locator('text=/Слишком много запросов/i')).toBeVisible();
    });
  });

  test.describe('Context Awareness', () => {
    test('should use project context when improving', async ({ page }) => {
      // Set up project with context
      const promptInput = page.locator('textarea[placeholder*="Опишите музыку"]');
      await promptInput.fill('electronic music');
      
      await page.fill('input[placeholder*="жанр"]', 'techno');
      await page.fill('input[placeholder*="настроение"]', 'energetic');

      // Mock AI with context-aware response
      await page.route('**/functions/v1/ai-improve-field', (route) => {
        const body = JSON.parse(route.request().postData() || '{}');
        expect(body.additionalContext).toBeDefined();
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            result: 'Energetic techno track with pulsating basslines and hypnotic rhythms',
            action: 'improve',
            field: 'prompt',
          }),
        });
      });

      // Improve with context
      await page.click('[data-testid="ai-improve-prompt"]');
      await page.click('text=✨ Улучшить');

      await expect(page.locator('text=Обработка')).not.toBeVisible({ timeout: 10000 });

      // Result should reflect context
      await expect(promptInput).toHaveValue(/techno/i);
      await expect(promptInput).toHaveValue(/energetic/i);
    });
  });

  test.describe('Loading States', () => {
    test('should disable buttons during processing', async ({ page }) => {
      // Mock slow AI response
      await page.route('**/functions/v1/ai-improve-field', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            result: 'Improved text',
            action: 'improve',
            field: 'prompt',
          }),
        });
      });

      const promptInput = page.locator('textarea[placeholder*="Опишите музыку"]');
      await promptInput.fill('test');
      
      // Click improve
      await page.click('[data-testid="ai-improve-prompt"]');
      await page.click('text=✨ Улучшить');

      // Button should be disabled
      await expect(page.locator('[data-testid="ai-improve-prompt"]')).toBeDisabled();

      // Wait for completion
      await expect(page.locator('text=Обработка')).not.toBeVisible({ timeout: 10000 });

      // Button should be enabled again
      await expect(page.locator('[data-testid="ai-improve-prompt"]')).toBeEnabled();
    });
  });
});
