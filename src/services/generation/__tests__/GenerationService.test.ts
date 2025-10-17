/**
 * Integration Tests для GenerationService
 * SPRINT 28: Testing Infrastructure & Bug Fixes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenerationService } from '../GenerationService';
import type { GenerationRequest } from '../GenerationService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    channel: vi.fn(),
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
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('GenerationService - Integration Tests', () => {
  const mockUserId = 'test-user-123';
  const mockTrackId = 'test-track-456';
  const mockTaskId = 'test-task-789';

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

    it('should reject too long prompt', async () => {
      const request: GenerationRequest = {
        prompt: 'a'.repeat(501),
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Описание не должно превышать 500 символов'
      );
    });

    it('should reject too long lyrics', async () => {
      const request: GenerationRequest = {
        prompt: 'Test prompt',
        lyrics: 'a'.repeat(3001),
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Текст песни не должен превышать 3000 символов'
      );
    });

    it('should reject invalid provider', async () => {
      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'invalid' as any,
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Неподдерживаемый провайдер'
      );
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Требуется авторизация'
      );
    });
  });

  describe('Successful Generation Flow', () => {
    beforeEach(() => {
      // Mock successful authentication
      (supabase.auth.getUser as any).mockResolvedValue({
        data: {
          user: { id: mockUserId },
        },
        error: null,
      });

      // Mock successful track creation
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

    it('should generate music with minimal parameters', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockResolvedValue({
        taskId: mockTaskId,
        message: 'Generation started',
      });

      const request: GenerationRequest = {
        prompt: 'Epic orchestral music',
        provider: 'suno',
      };

      const result = await GenerationService.generate(request);

      expect(result.success).toBe(true);
      expect(result.trackId).toBe(mockTrackId);
      expect(result.taskId).toBe(mockTaskId);
      expect(result.provider).toBe('suno');
    });

    it('should generate music with full parameters', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockResolvedValue({
        taskId: mockTaskId,
        message: 'Generation started',
      });

      const request: GenerationRequest = {
        prompt: 'Epic orchestral music',
        title: 'My Epic Track',
        lyrics: 'Verse 1\nChorus\nVerse 2',
        provider: 'suno',
        styleTags: ['orchestral', 'epic'],
        hasVocals: true,
        modelVersion: 'chirp-v3-5',
        customMode: true,
        makeInstrumental: false,
        negativeTags: 'no drums',
        styleWeight: 0.75,
        lyricsWeight: 0.65,
        weirdness: 0.2,
        audioWeight: 0.5,
        referenceAudioUrl: 'https://example.com/reference.mp3',
        referenceTrackId: 'ref-track-123',
        vocalGender: 'f',
        idempotencyKey: '00000000-0000-0000-0000-000000000001',
      };

      const result = await GenerationService.generate(request);

      expect(result.success).toBe(true);
      expect(result.trackId).toBe(mockTrackId);
      expect(generateMusic).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'suno',
          trackId: mockTrackId,
          title: 'My Epic Track',
          prompt: 'Epic orchestral music',
          lyrics: 'Verse 1\nChorus\nVerse 2',
          styleTags: ['orchestral', 'epic'],
          hasVocals: true,
          modelVersion: 'chirp-v3-5',
          makeInstrumental: false,
          negativeTags: 'no drums',
          styleWeight: 0.75,
          lyricsWeight: 0.65,
          weirdness: 0.2,
          audioWeight: 0.5,
          referenceAudioUrl: 'https://example.com/reference.mp3',
          referenceTrackId: 'ref-track-123',
          customMode: true,
          vocalGender: 'f',
          idempotencyKey: '00000000-0000-0000-0000-000000000001',
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock successful authentication
      (supabase.auth.getUser as any).mockResolvedValue({
        data: {
          user: { id: mockUserId },
        },
        error: null,
      });

      // Mock successful track creation
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

    it('should handle network errors', async () => {
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

    it('should handle provider errors', async () => {
      const { generateMusic } = await import('@/services/providers/router');
      (generateMusic as any).mockRejectedValue(
        new Error('Provider error: insufficient credits')
      );

      const request: GenerationRequest = {
        prompt: 'Test prompt',
        provider: 'suno',
      };

      await expect(GenerationService.generate(request)).rejects.toThrow(
        'Недостаточно кредитов для генерации'
      );
    });

    it('should handle database errors', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
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
  });

  describe('Real-time Subscriptions', () => {
    it('should create subscription for track updates', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      };

      (supabase.channel as any).mockReturnValue(mockChannel);

      const callback = vi.fn();
      const subscription = GenerationService.subscribe(mockTrackId, callback);

      expect(supabase.channel).toHaveBeenCalledWith(`track-status:${mockTrackId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'tracks',
          filter: `id=eq.${mockTrackId}`,
        }),
        expect.any(Function)
      );
      expect(subscription).toBe(mockChannel);
    });

    it('should unsubscribe from track updates', () => {
      const mockChannel = {
        unsubscribe: vi.fn(),
      };

      GenerationService.unsubscribe(mockChannel as any);

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });
});
