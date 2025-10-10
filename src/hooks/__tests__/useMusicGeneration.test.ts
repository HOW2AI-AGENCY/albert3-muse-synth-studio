import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useMusicGeneration', async () => {
  const actual = await vi.importActual<typeof import('../useMusicGeneration')>('../useMusicGeneration');
  return actual;
});

import { useMusicGeneration } from '@/hooks/useMusicGeneration';

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  logDebug: vi.fn(),
}));

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const supabaseMocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
  },
}));

const apiMocks = vi.hoisted(() => ({
  improvePrompt: vi.fn(),
  createTrack: vi.fn(),
  generateMusic: vi.fn(),
  getTrackById: vi.fn(),
}));

vi.mock('@/services/api.service', () => ({
  ApiService: apiMocks,
}));

describe('useMusicGeneration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    toastMock.mockClear();
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    apiMocks.createTrack.mockResolvedValue({ id: 'track-1', status: 'pending', title: 'My Track' });
    apiMocks.generateMusic.mockResolvedValue({ success: true, trackId: 'track-1' });
    apiMocks.getTrackById.mockResolvedValue({ id: 'track-1', status: 'completed', title: 'Done' });
    apiMocks.improvePrompt.mockResolvedValue({ improvedPrompt: 'Improved prompt' });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('prevents generation when prompt is empty', async () => {
    const { result } = renderHook(() => useMusicGeneration());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.generateMusic({ prompt: '   ' }, vi.fn());
    });

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

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.generateMusic({ prompt: 'Valid prompt' }, vi.fn());
    });

    expect(success).toBe(false);
    expect(apiMocks.createTrack).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Требуется авторизация',
      }),
    );
  });

  it('creates a track and polls until completion', async () => {
    const { result } = renderHook(() => useMusicGeneration());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.generateMusic({
        prompt: 'Generate an epic synthwave track',
        title: 'Epic track',
        provider: 'suno',
      }, vi.fn());
    });

    expect(success).toBe(true);
    expect(apiMocks.createTrack).toHaveBeenCalledWith(
      'user-1',
      'Epic track',
      'Generate an epic synthwave track',
      'suno',
      undefined,
      false,
      [],
    );
    expect(apiMocks.generateMusic).toHaveBeenCalledWith(
      expect.objectContaining({
        trackId: 'track-1',
        userId: 'user-1',
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(apiMocks.getTrackById).toHaveBeenCalledWith('track-1');
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '✅ Трек готов!',
      }),
    );
  });

  it('returns improved prompt and handles errors gracefully', async () => {
    const { result } = renderHook(() => useMusicGeneration());

    let improved: string | null | undefined;
    await act(async () => {
      improved = await result.current.improvePrompt('Make it better', vi.fn());
    });

    expect(improved).toBe('Improved prompt');
    expect(apiMocks.improvePrompt).toHaveBeenCalledWith('Make it better', expect.any(Function));

    apiMocks.improvePrompt.mockRejectedValueOnce(new Error('Nope'));

    let fallback: string | null | undefined;
    await act(async () => {
      fallback = await result.current.improvePrompt('Another prompt', vi.fn());
    });

    expect(fallback).toBeNull();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Nope',
      }),
    );
  });
});
