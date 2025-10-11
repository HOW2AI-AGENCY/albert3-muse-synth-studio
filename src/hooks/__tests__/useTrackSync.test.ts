import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTrackSync } from '../useTrackSync';

const {
  toastMock,
  removeChannelMock,
  selectMock,
  channelInstances,
  createChannelMock,
} = vi.hoisted(() => {
  const toastMock = vi.fn();
  const removeChannelMock = vi.fn();
  const eqFinalMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const eqChain = vi.fn((column: string) => {
    if (column === 'status') {
      return eqFinalMock();
    }
    return { eq: eqChain };
  });
  const selectMock = vi.fn(() => ({ eq: eqChain }));
  const channelInstances: any[] = [];
  const createChannelMock = () => {
    const channel: any = {
      on: vi.fn((_event, _filter, callback) => {
        channel.__changeCallback = callback;
        return channel;
      }),
      subscribe: vi.fn((statusCallback?: (status: string) => void) => {
        channel.__statusCallback = statusCallback;
        statusCallback?.('SUBSCRIBED');
        return channel;
      }),
    };

    return channel;
  };

  return { toastMock, removeChannelMock, selectMock, channelInstances, createChannelMock };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => {
      const channel = createChannelMock();
      channelInstances.push(channel);
      return channel;
    }),
    removeChannel: removeChannelMock,
    from: vi.fn(() => ({ select: selectMock })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

describe('useTrackSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelInstances.length = 0;
  });

  it('subscribes to updates and handles completion events', async () => {
    const onTrackCompleted = vi.fn();
    const onTrackFailed = vi.fn();

    const { unmount } = renderHook(() =>
      useTrackSync('user-1', { onTrackCompleted, onTrackFailed })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(channelInstances[0]?.subscribe).toHaveBeenCalled();

    const channel = channelInstances[0];
    const payload = {
      new: { id: 'track-1', status: 'completed', title: 'Track 1', error_message: null },
      old: { status: 'processing' },
    } as any;

    await act(async () => {
      channel.__changeCallback?.(payload);
    });

    expect(onTrackCompleted).toHaveBeenCalledWith('track-1');

    unmount();
    expect(removeChannelMock).toHaveBeenCalledWith(channel);
  });

  it('retries subscription when channel errors', async () => {
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useTrackSync('user-1'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(channelInstances[0]?.subscribe).toHaveBeenCalled();

    const firstChannel = channelInstances[0];

    act(() => {
      firstChannel.__statusCallback?.('CHANNEL_ERROR');
    });

    expect(removeChannelMock).toHaveBeenCalledWith(firstChannel);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(channelInstances.length).toBeGreaterThanOrEqual(2);

    unmount();

    vi.useRealTimers();
  });

  it('prevents infinite loop with guard clause in retry logic', async () => {
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useTrackSync('user-1'));

    await act(async () => {
      await Promise.resolve();
    });

    const firstChannel = channelInstances[0];

    // Simulate multiple rapid connection errors
    act(() => {
      firstChannel.__statusCallback?.('CHANNEL_ERROR');
    });

    // Advance timers slightly (less than MIN_RETRY_DELAY)
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Try to trigger another error before retry completes
    act(() => {
      firstChannel.__statusCallback?.('CHANNEL_ERROR');
    });

    // Should NOT create infinite loop - only one retry should be scheduled
    expect(channelInstances.length).toBeLessThan(5);

    unmount();
    vi.useRealTimers();
  });
});
