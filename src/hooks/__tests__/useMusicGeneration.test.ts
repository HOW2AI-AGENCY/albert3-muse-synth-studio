import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { ApiService } from '@/services/api.service';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ========== MOCKS ==========

vi.mock('@/services/api.service', () => ({
  ApiService: {
    createTrack: vi.fn(),
    generateMusic: vi.fn(),
    improvePrompt: vi.fn(),
  },
}));

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
} as unknown as RealtimeChannel;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    channel: vi.fn(() => mockChannel),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logger: {
    warn: vi.fn(),
  },
}));

// ========== TESTS ==========

describe('useMusicGenerationStore', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });
    vi.mocked(ApiService.createTrack).mockResolvedValue({
      id: 'track-123',
      title: 'Test Track',
      status: 'pending',
    } as any);
    vi.mocked(ApiService.generateMusic).mockResolvedValue({
      success: true,
      trackId: 'track-123',
    } as any);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  afterEach(() => {
    // Cleanup store state
    useMusicGenerationStore.getState().cleanupSubscription();
  });

  describe('setProvider', () => {
    it('должен изменять провайдера', () => {
      const { setProvider } = useMusicGenerationStore.getState();
      
      act(() => {
        setProvider('mureka');
      });

      expect(useMusicGenerationStore.getState().selectedProvider).toBe('mureka');
    });
  });

  describe('improvePrompt', () => {
    it('должен улучшать промпт через API', async () => {
      const improvedText = 'Улучшенный промпт с детализацией';
      vi.mocked(ApiService.improvePrompt).mockResolvedValue({
        improvedPrompt: improvedText,
      } as any);

      const { improvePrompt } = useMusicGenerationStore.getState();
      
      let result: string | null = null;
      await act(async () => {
        result = await improvePrompt('простой промпт', mockToast);
      });

      expect(result).toBe(improvedText);
      expect(mockToast).toHaveBeenCalledWith({
        title: '✨ Промпт улучшен!',
        description: 'Ваше описание было оптимизировано с помощью AI.',
      });
    });

    it('должен обрабатывать ошибки при улучшении', async () => {
      const error = new Error('API Error');
      vi.mocked(ApiService.improvePrompt).mockRejectedValue(error);

      const { improvePrompt } = useMusicGenerationStore.getState();
      
      let result: string | null = null;
      await act(async () => {
        result = await improvePrompt('промпт', mockToast);
      });

      expect(result).toBeNull();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Ошибка',
        description: 'API Error',
        variant: 'destructive',
      });
    });

    it('должен валидировать пустой промпт', async () => {
      const { improvePrompt } = useMusicGenerationStore.getState();
      
      let result: string | null = null;
      await act(async () => {
        result = await improvePrompt('', mockToast);
      });

      expect(result).toBeNull();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Ошибка',
        description: 'Пожалуйста, введите описание музыки для улучшения.',
        variant: 'destructive',
      });
    });

    it('должен игнорировать повторные вызовы во время выполнения', async () => {
      vi.mocked(ApiService.improvePrompt).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ improvedPrompt: 'test' } as any), 100))
      );

      const { improvePrompt } = useMusicGenerationStore.getState();
      
      await act(async () => {
        const promise1 = improvePrompt('промпт', mockToast);
        const promise2 = improvePrompt('промпт', mockToast);
        
        await promise1;
        const result2 = await promise2;
        
        expect(result2).toBeNull();
      });
    });
  });

  describe('generateMusic', () => {
    it('должен генерировать музыку с провайдером suno', async () => {
      const { generateMusic } = useMusicGenerationStore.getState();
      const onSuccess = vi.fn();

      let result: boolean = false;
      await act(async () => {
        result = await generateMusic({
          prompt: 'энергичная рок музыка',
          title: 'Рок трек',
          provider: 'suno',
        }, mockToast, onSuccess);
      });

      expect(result).toBe(true);
      expect(ApiService.createTrack).toHaveBeenCalledWith(
        mockUser.id,
        'Рок трек',
        'энергичная рок музыка',
        'suno',
        undefined,
        undefined,
        undefined
      );
      expect(ApiService.generateMusic).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: '🎵 Генерация началась!',
        description: 'Ваш трек создаётся. Это может занять около минуты...',
      });
      expect(onSuccess).toHaveBeenCalled();
    });

    it('должен генерировать музыку с провайдером mureka', async () => {
      const { generateMusic } = useMusicGenerationStore.getState();

      let result: boolean = false;
      await act(async () => {
        result = await generateMusic({
          prompt: 'спокойная электронная музыка',
          title: 'Ambient Track',
          provider: 'mureka',
        }, mockToast);
      });

      expect(result).toBe(true);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-mureka', {
        body: expect.objectContaining({
          trackId: 'track-123',
          title: 'Ambient Track',
          prompt: 'спокойная электронная музыка',
        })
      });
    });

    it('должен валидировать пустой промпт', async () => {
      const { generateMusic } = useMusicGenerationStore.getState();

      let result: boolean = false;
      await act(async () => {
        result = await generateMusic({
          prompt: '   ',
          title: 'Test',
        }, mockToast);
      });

      expect(result).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Ошибка',
        description: 'Пожалуйста, введите описание музыки',
        variant: 'destructive',
      });
    });

    it('должен проверять авторизацию', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const { generateMusic } = useMusicGenerationStore.getState();

      let result: boolean = false;
      await act(async () => {
        result = await generateMusic({
          prompt: 'тест',
          title: 'Test',
        }, mockToast);
      });

      expect(result).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Требуется авторизация',
        description: 'Войдите в систему для генерации музыки',
        variant: 'destructive',
      });
    });

    it('должен предотвращать двойные клики (debounce)', async () => {
      const { generateMusic } = useMusicGenerationStore.getState();

      await act(async () => {
        const result1 = await generateMusic({
          prompt: 'тест',
          title: 'Test',
        }, mockToast);
        
        // Immediate second call should be ignored
        const result2 = await generateMusic({
          prompt: 'тест 2',
          title: 'Test 2',
        }, mockToast);

        expect(result1).toBe(true);
        expect(result2).toBe(false);
        expect(ApiService.createTrack).toHaveBeenCalledTimes(1);
      });
    });

    it('должен подписываться на realtime обновления', async () => {
      const { generateMusic } = useMusicGenerationStore.getState();

      await act(async () => {
        await generateMusic({
          prompt: 'тест',
          title: 'Test',
        }, mockToast);
      });

      expect(supabase.channel).toHaveBeenCalledWith('track-status:track-123');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('должен очищать подписку при завершении генерации', async () => {
      const mockOnCallback = vi.fn();
      vi.mocked(mockChannel.on).mockImplementation((_event, _filter, callback: any) => {
        mockOnCallback.mockImplementation(callback);
        return mockChannel;
      });

      const { generateMusic } = useMusicGenerationStore.getState();

      await act(async () => {
        await generateMusic({
          prompt: 'тест',
          title: 'Test',
        }, mockToast);
      });

      // Simulate realtime update with status 'completed'
      await act(async () => {
        mockOnCallback({
          new: {
            status: 'completed',
            title: 'Test',
          },
        });
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: '✅ Трек готов!',
          description: 'Ваш трек "Test" успешно сгенерирован.',
        });
        expect(mockChannel.unsubscribe).toHaveBeenCalled();
      });
    });

    it('должен обрабатывать failed статус', async () => {
      const mockOnCallback = vi.fn();
      vi.mocked(mockChannel.on).mockImplementation((_event, _filter, callback: any) => {
        mockOnCallback.mockImplementation(callback);
        return mockChannel;
      });

      const { generateMusic } = useMusicGenerationStore.getState();

      await act(async () => {
        await generateMusic({
          prompt: 'тест',
          title: 'Test',
        }, mockToast);
      });

      // Simulate realtime update with status 'failed'
      await act(async () => {
        mockOnCallback({
          new: {
            status: 'failed',
            title: 'Test',
            error_message: 'Generation timeout',
          },
        });
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: '❌ Ошибка генерации',
          description: 'Generation timeout',
          variant: 'destructive',
        });
        expect(mockChannel.unsubscribe).toHaveBeenCalled();
      });
    });

    it('должен автоматически очищать подписку через 5 минут', async () => {
      vi.useFakeTimers();

      const { generateMusic } = useMusicGenerationStore.getState();

      await act(async () => {
        await generateMusic({
          prompt: 'тест',
          title: 'Test',
        }, mockToast);
      });

      // Fast-forward 5 minutes
      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(mockChannel.unsubscribe).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('должен обрабатывать сетевые ошибки', async () => {
      const networkError = new Error('Failed to fetch');
      vi.mocked(ApiService.createTrack).mockRejectedValue(networkError);

      const { generateMusic } = useMusicGenerationStore.getState();

      let result: boolean = false;
      await act(async () => {
        result = await generateMusic({
          prompt: 'тест',
          title: 'Test',
        }, mockToast);
      });

      expect(result).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Проблема соединения',
        description: expect.stringContaining('Нет связи с Supabase'),
        variant: 'destructive',
      });
    });
  });

  describe('cleanupSubscription', () => {
    it('должен очищать подписку и таймер', async () => {
      vi.useFakeTimers();
      
      const { generateMusic, cleanupSubscription } = useMusicGenerationStore.getState();

      await act(async () => {
        await generateMusic({
          prompt: 'тест',
          title: 'Test',
        }, mockToast);
      });

      expect(useMusicGenerationStore.getState().subscription).toBeTruthy();
      expect(useMusicGenerationStore.getState().autoCleanupTimer).toBeTruthy();

      act(() => {
        cleanupSubscription();
      });

      expect(useMusicGenerationStore.getState().subscription).toBeNull();
      expect(useMusicGenerationStore.getState().autoCleanupTimer).toBeNull();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
