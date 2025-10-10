import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';

// Mock the store to control its behavior in tests
vi.mock('@/stores/useMusicGenerationStore');

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe('useMusicGeneration hook', () => {
  const generateMusicFn = vi.fn();
  const improvePromptFn = vi.fn();
  const cleanupSubscriptionFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockClear();

    // Provide a mock implementation for the store's return value
    vi.mocked(useMusicGenerationStore).mockReturnValue({
      generateMusic: generateMusicFn,
      improvePrompt: improvePromptFn,
      cleanupSubscription: cleanupSubscriptionFn,
      isGenerating: false,
      isImproving: false,
      subscription: null,
    });
  });

  it('should return the state and functions from the store', () => {
    const { result } = renderHook(() => useMusicGeneration());
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.isImproving).toBe(false);
    expect(result.current.generateMusic).toBe(generateMusicFn);
    expect(result.current.improvePrompt).toBe(improvePromptFn);
  });

  it('should call generateMusic from the store when invoked', async () => {
    generateMusicFn.mockResolvedValue(true);
    const { result } = renderHook(() => useMusicGeneration());
    const options = { prompt: 'A test prompt' };
    const response = await act(async () => result.current.generateMusic(options, toastMock));
    expect(response).toBe(true);
    expect(generateMusicFn).toHaveBeenCalledWith(options, toastMock);
  });

  it('should call improvePrompt from the store when invoked', async () => {
    improvePromptFn.mockResolvedValue('An improved prompt');
    const { result } = renderHook(() => useMusicGeneration());
    const response = await act(async () => result.current.improvePrompt('A prompt', toastMock));
    expect(response).toBe('An improved prompt');
    expect(improvePromptFn).toHaveBeenCalledWith('A prompt', toastMock);
  });

  it('should call cleanupSubscription on unmount', () => {
    const { unmount } = renderHook(() => useMusicGeneration());
    unmount();
    expect(cleanupSubscriptionFn).toHaveBeenCalled();
  });
});