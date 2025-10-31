/**
 * Unit Tests for useGenerateMusic Hook
 * Week 3: Testing Infrastructure - Day 1
 * 
 * Test Coverage:
 * - Basic generation flow
 * - Validation (empty/long prompts)
 * - Rate limiting enforcement
 * - Concurrent generation protection
 * - Realtime subscription setup
 * - Status update handling (completed/failed)
 * - Cached results handling
 * - Cleanup on unmount
 * - Debounce protection
 * - Error handling (network, provider, etc.)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGenerateMusic } from '../useGenerateMusic';
import { GenerationService } from '@/services/generation';
import { supabase } from '@/integrations/supabase/client';
import { rateLimiter } from '@/utils/rateLimiter';
import {
  createMockToast,
  createMockGenerationService,
  TEST_USER_ID,
  TEST_TRACK_ID,
  TEST_TASK_ID,
  VALID_PROMPT,
  EMPTY_PROMPT,
  wait,
} from '@/test/utils/test-helpers';

// ============= Mocks =============

vi.mock('@/integrations/supabase/client');
vi.mock('@/services/generation/GenerationService');
vi.mock('@/utils/rateLimiter');
vi.mock('@/utils/logger');

// ============= Test Setup =============

describe('useGenerateMusic', () => {
  let mockToast: ReturnType<typeof createMockToast>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;
  let mockGenerationService: ReturnType<typeof createMockGenerationService>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    mockToast = createMockToast();
    mockOnSuccess = vi.fn();
    mockGenerationService = createMockGenerationService();

    // Mock Supabase auth
    (supabase.auth.getUser as any) = vi.fn().mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });

    // Mock GenerationService
    (GenerationService.generate as any) = mockGenerationService.generate;
    (GenerationService.subscribe as any) = mockGenerationService.subscribe;
    (GenerationService.unsubscribe as any) = mockGenerationService.unsubscribe;

    // Mock rate limiter - allow by default
    (rateLimiter.check as any) = vi.fn().mockReturnValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============= Basic Generation Flow =============

  describe('Basic Generation Flow', () => {
    it('should successfully generate music with valid prompt', async () => {
      const { result } = renderHook(() =>
        useGenerateMusic({
          provider: 'suno',
          onSuccess: mockOnSuccess,
          toast: mockToast,
        })
      );

      expect(result.current.isGenerating).toBe(false);

      await act(async () => {
        const success = await result.current.generate({
          prompt: VALID_PROMPT,
          provider: 'suno',
        });
        expect(success).toBe(true);
      });

      // Verify GenerationService was called
      expect(GenerationService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: VALID_PROMPT,
          provider: 'suno',
        })
      );

      // Verify success toast
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🎵 Генерация началась!',
        })
      );

      // Verify subscription setup
      expect(GenerationService.subscribe).toHaveBeenCalledWith(
        TEST_TRACK_ID,
        expect.any(Function)
      );

      // Verify onSuccess callback
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should pass all parameters to GenerationService', async () => {
      const { result } = renderHook(() =>
        useGenerateMusic({
          provider: 'suno',
          toast: mockToast,
        })
      );

      await act(async () => {
        await result.current.generate({
          prompt: VALID_PROMPT,
          provider: 'suno',
          title: 'My Track',
          lyrics: 'Verse 1\nChorus',
          styleTags: ['rock', 'epic'],
          hasVocals: true,
          modelVersion: 'chirp-v3-5',
        });
      });

      expect(GenerationService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: VALID_PROMPT,
          provider: 'suno',
          title: 'My Track',
          lyrics: 'Verse 1\nChorus',
          styleTags: ['rock', 'epic'],
          hasVocals: true,
          modelVersion: 'chirp-v3-5',
        })
      );
    });
  });

  // ============= Validation =============

  describe('Validation', () => {
    it('should reject empty prompt', async () => {
      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        const success = await result.current.generate({
          prompt: EMPTY_PROMPT,
          provider: 'suno',
        });
        expect(success).toBe(false);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ошибка',
          description: 'Пожалуйста, введите описание музыки',
          variant: 'destructive',
        })
      );

      expect(GenerationService.generate).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only prompt', async () => {
      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        const success = await result.current.generate({
          prompt: '   ',
          provider: 'suno',
        });
        expect(success).toBe(false);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Пожалуйста, введите описание музыки',
          variant: 'destructive',
        })
      );
    });

    it('should accept valid prompt (>= 3 chars after trim)', async () => {
      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        const success = await result.current.generate({
          prompt: '  abc  ', // 3 chars after trim
          provider: 'suno',
        });
        expect(success).toBe(true);
      });

      expect(GenerationService.generate).toHaveBeenCalled();
    });
  });

  // ============= Concurrent Generation Protection =============

  describe('Concurrent Generation Protection', () => {
    it('should prevent concurrent generations', async () => {
      // Make generate take time
      (GenerationService.generate as any) = vi.fn().mockImplementation(async () => {
        await wait(100);
        return {
          success: true,
          trackId: TEST_TRACK_ID,
          taskId: TEST_TASK_ID,
          provider: 'suno',
        };
      });

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      // Start first generation
      const promise1 = act(async () => {
        return result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      // isGenerating should be true
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      // Try second generation while first is in progress
      await act(async () => {
        const success = await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
        expect(success).toBe(false);
      });

      // Verify blocked message
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Подождите',
          description: 'Предыдущая генерация ещё выполняется',
          variant: 'destructive',
        })
      );

      await promise1;
    });

    it('should allow generation after previous completes', async () => {
      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      // First generation
      await act(async () => {
        await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      expect(result.current.isGenerating).toBe(false);

      // Second generation should succeed
      await act(async () => {
        const success = await result.current.generate({ prompt: 'Another prompt', provider: 'suno' });
        expect(success).toBe(true);
      });

      expect(GenerationService.generate).toHaveBeenCalledTimes(2);
    });
  });

  // ============= Rate Limiting =============

  describe('Rate Limiting', () => {
    it('should enforce rate limiting', async () => {
      (rateLimiter.check as any) = vi.fn().mockReturnValue({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 30000, // 30 seconds
      });

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        const success = await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
        expect(success).toBe(false);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '⏱️ Превышен лимит запросов',
          variant: 'destructive',
        })
      );

      expect(GenerationService.generate).not.toHaveBeenCalled();
    });

    it('should allow generation when rate limit is ok', async () => {
      (rateLimiter.check as any) = vi.fn().mockReturnValue({
        allowed: true,
        remaining: 5,
        resetAt: Date.now() + 60000,
      });

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        const success = await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
        expect(success).toBe(true);
      });

      expect(GenerationService.generate).toHaveBeenCalled();
    });
  });

  // ============= Realtime Subscription =============

  describe('Realtime Subscription', () => {
    it('should setup realtime subscription on new generation', async () => {
      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
          onSuccess: mockOnSuccess,
        })
      );

      await act(async () => {
        await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      expect(GenerationService.subscribe).toHaveBeenCalledWith(
        TEST_TRACK_ID,
        expect.any(Function)
      );
    });

    it('should NOT setup subscription for cached results', async () => {
      (GenerationService.generate as any) = vi.fn().mockResolvedValue({
        success: true,
        trackId: TEST_TRACK_ID,
        taskId: 'cached',
        provider: 'suno',
      });

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      expect(GenerationService.subscribe).not.toHaveBeenCalled();
    });

    it('should handle "completed" status update', async () => {
      let statusCallback: any;
      (GenerationService.subscribe as any) = vi.fn().mockImplementation((_trackId, cb) => {
        statusCallback = cb;
        return { unsubscribe: vi.fn() };
      });

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
          onSuccess: mockOnSuccess,
        })
      );

      await act(async () => {
        await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      // Simulate completed status
      act(() => {
        statusCallback('completed', { title: 'My Track' });
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '✅ Трек готов!',
          description: expect.stringContaining('My Track'),
        })
      );

      expect(mockOnSuccess).toHaveBeenCalledTimes(2); // Once on generate, once on complete
    });

    it('should handle "failed" status update', async () => {
      let statusCallback: any;
      (GenerationService.subscribe as any) = vi.fn().mockImplementation((_trackId, cb) => {
        statusCallback = cb;
        return { unsubscribe: vi.fn() };
      });

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      // Simulate failed status
      act(() => {
        statusCallback('failed', { errorMessage: 'API Error' });
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '❌ Ошибка генерации',
          description: 'API Error',
          variant: 'destructive',
        })
      );
    });
  });

  // ============= Cached Results =============

  describe('Cached Results', () => {
    it('should show info toast for cached results', async () => {
      (GenerationService.generate as any) = vi.fn().mockResolvedValue({
        success: true,
        trackId: TEST_TRACK_ID,
        taskId: 'cached',
        provider: 'suno',
      });

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '⚡ Трек найден!',
          description: expect.stringContaining('ранее созданный'),
        })
      );
    });
  });

  // ============= Cleanup =============

  describe('Cleanup', () => {
    it('should cleanup subscriptions on unmount', () => {
      const mockChannel = { unsubscribe: vi.fn() };
      (GenerationService.subscribe as any) = vi.fn().mockReturnValue(mockChannel);

      const { result, unmount } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      act(() => {
        result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should cleanup on manual cleanup call', async () => {
      const mockChannel = { unsubscribe: vi.fn() };
      (GenerationService.subscribe as any) = vi.fn().mockReturnValue(mockChannel);

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      act(() => {
        result.current.cleanup();
      });

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  // ============= Debounce Protection =============

  describe('Debounce Protection', () => {
    it('should debounce rapid generate calls', async () => {
      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      // First call
      await act(async () => {
        const success1 = await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
        expect(success1).toBe(true);
      });

      // Immediate second call (within 2s) - should be blocked by debounce
      await act(async () => {
        const success2 = await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
        expect(success2).toBe(false);
      });

      // Only one call to GenerationService
      expect(GenerationService.generate).toHaveBeenCalledTimes(1);

      // Wait for debounce delay
      await act(async () => {
        await wait(2100);
      });

      // Third call after debounce - should succeed
      await act(async () => {
        const success3 = await result.current.generate({ prompt: 'New prompt', provider: 'suno' });
        expect(success3).toBe(true);
      });

      expect(GenerationService.generate).toHaveBeenCalledTimes(2);
    });
  });

  // ============= Error Handling =============

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (GenerationService.generate as any) = vi.fn().mockRejectedValue(
        new Error('Failed to fetch')
      );

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        const success = await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
        expect(success).toBe(false);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Проблема соединения',
          description: expect.stringContaining('Нет связи с сервером'),
          variant: 'destructive',
        })
      );

      expect(result.current.isGenerating).toBe(false);
    });

    it('should handle GenerationService errors', async () => {
      (GenerationService.generate as any) = vi.fn().mockRejectedValue(
        new Error('Недостаточно кредитов')
      );

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      await act(async () => {
        const success = await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
        expect(success).toBe(false);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ошибка генерации',
          description: 'Недостаточно кредитов',
          variant: 'destructive',
        })
      );
    });

    it('should reset isGenerating flag on error', async () => {
      (GenerationService.generate as any) = vi.fn().mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() =>
        useGenerateMusic({
          toast: mockToast,
        })
      );

      expect(result.current.isGenerating).toBe(false);

      await act(async () => {
        await result.current.generate({ prompt: VALID_PROMPT, provider: 'suno' });
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });
});
