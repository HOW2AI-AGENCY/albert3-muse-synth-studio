/**
 * Error Scenario Tests для GenerationService
 * SPRINT 28: Testing Infrastructure & Bug Fixes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenerationService } from '../GenerationService';
import type { GenerationRequest } from '../GenerationService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');
vi.mock('@/services/providers/router');
vi.mock('@/utils/logger');

describe('GenerationService - Error Scenarios', () => {
  const mockUserId = 'test-user-123';
  const mockTrackId = 'test-track-456';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful auth
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Default successful track creation
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: mockTrackId },
            error: null,
          }),
        }),
      }),
    });
  });

  describe('Network Errors', () => {
    it('should handle fetch failures', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockRejectedValue(new Error('Failed to fetch'));

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Нет связи с сервером'
      );
    });

    it('should handle network timeouts', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockRejectedValue(new Error('Request timeout'));

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Превышено время ожидания'
      );
    });
  });

  describe('Provider Errors', () => {
    it('should handle insufficient credits', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockRejectedValue(
        new Error('Insufficient credits for generation')
      );

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Недостаточно кредитов для генерации'
      );
    });

    it('should handle invalid API key', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockRejectedValue(new Error('Invalid API key'));

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Ошибка авторизации провайдера'
      );
    });

    it('should handle rate limits', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockRejectedValue(new Error('Rate limit exceeded'));

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Превышен лимит запросов'
      );
    });
  });

  describe('Database Errors', () => {
    it('should handle track creation failure', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database constraint violation'),
            }),
          }),
        }),
      });

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow();
    });

    it('should handle missing track ID', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {},
              error: null,
            }),
          }),
        }),
      });

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Track ID not returned from database'
      );
    });
  });

  describe('Concurrent Generation Protection', () => {
    it('should handle multiple concurrent generations gracefully', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      let callCount = 0;

      (generateMusic as any).mockImplementation(async () => {
        callCount++;
        if (callCount > 3) {
          throw new Error('Rate limit exceeded');
        }
        return { taskId: `task-${callCount}`, message: 'Started' };
      });

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      const promises = Array(5)
        .fill(null)
        .map(() => GenerationService.generate(request));

      const results = await Promise.allSettled(promises);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(succeeded.length).toBe(3);
      expect(failed.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error objects', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockRejectedValue({});

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Не удалось сгенерировать музыку'
      );
    });

    it('should handle null errors', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockRejectedValue(null);

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Не удалось сгенерировать музыку'
      );
    });
  });
});
