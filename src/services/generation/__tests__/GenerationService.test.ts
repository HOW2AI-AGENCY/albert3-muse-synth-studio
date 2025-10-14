/**
 * Unit Tests for GenerationService
 * Tests validation, track creation, and provider routing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerationService } from '../GenerationService';
import type { GenerationRequest } from '../GenerationService';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
  },
}));

// Mock provider router
vi.mock('@/services/providers/router', () => ({
  generateMusic: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('GenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation', () => {
    it('should reject empty prompt', async () => {
      const request: GenerationRequest = {
        prompt: '',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Описание должно содержать минимум 3 символа'
      );
    });

    it('should reject prompt that is too short', async () => {
      const request: GenerationRequest = {
        prompt: 'ab',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Описание должно содержать минимум 3 символа'
      );
    });

    it('should reject prompt that is too long', async () => {
      const request: GenerationRequest = {
        prompt: 'a'.repeat(501),
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Описание не должно превышать 500 символов'
      );
    });

    it('should reject lyrics that are too long', async () => {
      const request: GenerationRequest = {
        prompt: 'Valid prompt',
        lyrics: 'a'.repeat(3001),
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Текст песни не должен превышать 3000 символов'
      );
    });

    it('should reject unsupported provider', async () => {
      const request: GenerationRequest = {
        prompt: 'Valid prompt',
        provider: 'invalid' as any,
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Неподдерживаемый провайдер: invalid'
      );
    });

    it('should accept valid request', async () => {
      const request: GenerationRequest = {
        prompt: 'A beautiful ambient track',
        provider: 'suno',
      };

      // Mock successful auth
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          } as any,
        },
        error: null,
      });

      // Mock successful track creation
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-track-id' },
            error: null,
          }),
        })),
      }));
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      // Mock provider router
      const { generateMusic } = await import('@/services/providers/router');
      vi.mocked(generateMusic).mockResolvedValue({
        success: true,
        taskId: 'test-task-id',
        trackId: 'test-track-id',
        message: 'Generation started',
      });

      const result = await GenerationService.generate(request);

      expect(result.success).toBe(true);
      expect(result.trackId).toBe('test-track-id');
      expect(result.taskId).toBe('test-task-id');
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const request: GenerationRequest = {
        prompt: 'Valid prompt',
        provider: 'suno',
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' } as any,
      });

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Требуется авторизация'
      );
    });
  });

  describe('Provider Routing', () => {
    beforeEach(async () => {
      // Setup successful auth and track creation for routing tests
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          } as any,
        },
        error: null,
      });

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-track-id' },
            error: null,
          }),
        })),
      }));
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);
    });

    it('should route to Suno provider', async () => {
      const request: GenerationRequest = {
        prompt: 'Suno track',
        provider: 'suno',
      };

      const { generateMusic } = await import('@/services/providers/router');
      vi.mocked(generateMusic).mockResolvedValue({
        success: true,
        taskId: 'suno-task-id',
        trackId: 'test-track-id',
        message: 'Suno generation started',
      });

      const result = await GenerationService.generate(request);

      expect(generateMusic).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'suno',
          trackId: 'test-track-id',
        })
      );
      expect(result.provider).toBe('suno');
    });

    it('should route to Mureka provider', async () => {
      const request: GenerationRequest = {
        prompt: 'Mureka track',
        provider: 'mureka',
      };

      const { generateMusic } = await import('@/services/providers/router');
      vi.mocked(generateMusic).mockResolvedValue({
        success: true,
        taskId: 'mureka-task-id',
        trackId: 'test-track-id',
        message: 'Mureka generation started',
      });

      const result = await GenerationService.generate(request);

      expect(generateMusic).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'mureka',
          trackId: 'test-track-id',
        })
      );
      expect(result.provider).toBe('mureka');
    });
  });

  describe('Track Creation', () => {
    it('should create track with correct default values', async () => {
      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          } as any,
        },
        error: null,
      });

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-track-id' },
            error: null,
          }),
        })),
      }));
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { generateMusic } = await import('@/services/providers/router');
      vi.mocked(generateMusic).mockResolvedValue({
        success: true,
        taskId: 'test-task-id',
        trackId: 'test-track-id',
      });

      await GenerationService.generate(request);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          prompt: 'Test prompt',
          status: 'pending',
          provider: 'suno',
          has_vocals: true,
        })
      );
    });

    it('should use custom title if provided', async () => {
      const request: GenerationRequest = {
        prompt: 'Test prompt',
        title: 'Custom Title',
        provider: 'suno',
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          } as any,
        },
        error: null,
      });

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-track-id' },
            error: null,
          }),
        })),
      }));
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { generateMusic } = await import('@/services/providers/router');
      vi.mocked(generateMusic).mockResolvedValue({
        success: true,
        taskId: 'test-task-id',
        trackId: 'test-track-id',
      });

      await GenerationService.generate(request);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Title',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          } as any,
        },
        error: null,
      });

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-track-id' },
            error: null,
          }),
        })),
      }));
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { generateMusic } = await import('@/services/providers/router');
      vi.mocked(generateMusic).mockRejectedValue(
        new Error('Failed to fetch')
      );

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Нет связи с сервером. Проверьте подключение к интернету.'
      );
    });

    it('should handle database errors', async () => {
      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          } as any,
        },
        error: null,
      });

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        })),
      }));
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Не удалось создать запись трека'
      );
    });
  });
});
