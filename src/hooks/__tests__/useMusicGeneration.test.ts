import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';

// Use vi.hoisted() to ensure mocks are available before imports
const toastMock = vi.hoisted(() => vi.fn());
const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
}));
const apiMocks = vi.hoisted(() => ({
  improvePrompt: vi.fn(),
  createTrack: vi.fn(),
  generateMusic: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    channel: supabaseMocks.channel,
  },
}));

vi.mock('@/services/api.service', () => ({
  ApiService: apiMocks,
}));

describe('useMusicGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockClear();
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    apiMocks.createTrack.mockResolvedValue({ id: 'track-1', status: 'pending', title: 'My Track' });
    apiMocks.generateMusic.mockResolvedValue({ success: true, trackId: 'track-1' });
    apiMocks.improvePrompt.mockResolvedValue({ improvedPrompt: 'Improved prompt' });
  });

  afterEach(() => {
    act(() => {
      useMusicGenerationStore.getState().cleanupSubscription();
    });
  });

  it('prevents generation when prompt is empty', async () => {
    const { result } = renderHook(() => useMusicGeneration());
    const success = await act(() => result.current.generateMusic({ prompt: '   ' }, toastMock));

    expect(success).toBe(false);
    expect(apiMocks.createTrack).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ошибка',
        description: 'Пожалуйста, введите описание музыки',
      }),
    );
  });

  it('aborts when user is not authenticated', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    const { result } = renderHook(() => useMusicGeneration());
    const success = await act(() => result.current.generateMusic({ prompt: 'Valid prompt' }, toastMock));

    expect(success).toBe(false);
    expect(apiMocks.createTrack).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Требуется авторизация',
      }),
    );
  });

  it('creates a track and initiates generation', async () => {
    const { result } = renderHook(() => useMusicGeneration());
    const request = {
      prompt: 'Generate an epic synthwave track',
      title: 'Epic track',
      provider: 'suno' as const,
      styleTags: ['synthwave'],
      hasVocals: false,
      customMode: false,
    };
    const success = await act(() => result.current.generateMusic(request, toastMock));

    expect(success).toBe(true);
    expect(apiMocks.createTrack).toHaveBeenCalledWith(
      'user-1',
      'Epic track',
      'Generate an epic synthwave track',
      'suno',
      undefined,
      false,
      ['synthwave'],
    );
    expect(apiMocks.generateMusic).toHaveBeenCalledWith(expect.objectContaining({
      trackId: 'track-1',
      userId: 'user-1'
    }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: '🎵 Генерация началась!' })
      );
    });
    expect(supabaseMocks.channel).toHaveBeenCalledWith('track-status:track-1');
  });

  it('returns improved prompt and handles errors gracefully', async () => {
    const { result } = renderHook(() => useMusicGeneration());
    const improved = await act(() => result.current.improvePrompt('Make it better', toastMock));

    expect(improved).toBe('Improved prompt');
    expect(apiMocks.improvePrompt).toHaveBeenCalledWith({ prompt: 'Make it better' });

    apiMocks.improvePrompt.mockRejectedValueOnce(new Error('Nope'));
    const fallback = await act(() => result.current.improvePrompt('Another prompt', toastMock));

    expect(fallback).toBeNull();
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Nope' })
      );
    });
  });
});
