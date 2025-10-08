import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTrackSync } from '../useTrackSync';

const toastMock = vi.fn();
const removeChannelMock = vi.fn();
const channelSubscribeMock = vi.fn();
const channelOnMock = vi.fn();
const eqFinalMock = vi.fn().mockResolvedValue({ data: [], error: null });
const eqChain = vi.fn((column: string) => {
  if (column === 'status') {
    return eqFinalMock();
  }
  return { eq: eqChain };
});
const selectMock = vi.fn(() => ({ eq: eqChain }));

const channelMock: any = {};
channelMock.on = channelOnMock.mockImplementation((event, filter, callback) => {
  channelMock.__callback = callback;
  return channelMock;
});
channelMock.subscribe = channelSubscribeMock.mockImplementation((statusCallback?: (status: string) => void) => {
  statusCallback?.('SUBSCRIBED');
  return channelMock;
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => channelMock),
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
    channelMock.__callback = undefined;
  });

  it('subscribes to updates and handles completion events', async () => {
    const onTrackCompleted = vi.fn();
    const onTrackFailed = vi.fn();

    const { result, unmount } = renderHook(() =>
      useTrackSync('user-1', { onTrackCompleted, onTrackFailed })
    );

    await waitFor(() => {
      expect(channelSubscribeMock).toHaveBeenCalled();
      expect(result.current.isSubscribed).toBe(true);
    });

    const payload = {
      new: { id: 'track-1', status: 'completed', title: 'Track 1', error_message: null },
      old: { status: 'processing' },
    } as any;

    await act(async () => {
      channelMock.__callback?.(payload);
    });

    expect(onTrackCompleted).toHaveBeenCalledWith('track-1');

    unmount();
    expect(removeChannelMock).toHaveBeenCalledWith(channelMock);
  });
});
