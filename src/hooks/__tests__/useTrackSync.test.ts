import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTrackSync } from '../useTrackSync';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RealtimeSubscriptionManager from '@/services/realtimeSubscriptionManager';
import { supabase } from '@/integrations/supabase/client';

// Mock the RealtimeSubscriptionManager
vi.mock('@/services/realtimeSubscriptionManager', () => ({
  default: {
    subscribeToUserTracks: vi.fn(),
  },
}));

// Mock logger and toast
vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock TanStack Query's invalidateQueries
const invalidateQueriesMock = vi.fn();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
queryClient.invalidateQueries = invalidateQueriesMock;

// Wrapper component to provide the QueryClient
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useTrackSync', () => {
  let handlerCallback: ((payload: any) => void) | null = null;
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Capture the handler passed to the subscription manager
    (RealtimeSubscriptionManager.subscribeToUserTracks as vi.Mock).mockImplementation((userId, projectId, callback) => {
      handlerCallback = callback;
      return mockUnsubscribe;
    });
  });

  it('should not subscribe if userId or enabled is not provided', () => {
    renderHook(() => useTrackSync(undefined, { enabled: true }), { wrapper });
    expect(RealtimeSubscriptionManager.subscribeToUserTracks).not.toHaveBeenCalled();

    renderHook(() => useTrackSync('user-1', { enabled: false }), { wrapper });
    expect(RealtimeSubscriptionManager.subscribeToUserTracks).not.toHaveBeenCalled();
  });

  it('should subscribe to user tracks when enabled with a userId', () => {
    renderHook(() => useTrackSync('user-1', { enabled: true }), { wrapper });
    expect(RealtimeSubscriptionManager.subscribeToUserTracks).toHaveBeenCalledWith('user-1', null, expect.any(Function));
  });

  it('should call onTrackCompleted and invalidate queries when a track status changes to completed', async () => {
    const onTrackCompleted = vi.fn();
    renderHook(() => useTrackSync('user-1', { onTrackCompleted }), { wrapper });

    const payload = {
      new: { id: 'track-123', status: 'completed', title: 'Test Song' },
      old: { status: 'processing' },
    };

    act(() => {
      handlerCallback?.(payload);
    });

    expect(onTrackCompleted).toHaveBeenCalledWith('track-123');
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['tracks', 'track-123', 'versions'],
    });
  });

  it('should call onTrackFailed when a track status changes to failed', () => {
    const onTrackFailed = vi.fn();
    renderHook(() => useTrackSync('user-1', { onTrackFailed }), { wrapper });

    const payload = {
      new: { id: 'track-456', status: 'failed', error_message: 'Generation timed out' },
      old: { status: 'processing' },
    };

    act(() => {
      handlerCallback?.(payload);
    });

    expect(onTrackFailed).toHaveBeenCalledWith('track-456', 'Generation timed out');
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useTrackSync('user-1'), { wrapper });
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should check for stale tracks on mount', async () => {
      const staleTrack = {
          id: 'stale-track-1',
          title: 'Stale Track',
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
          status: 'processing',
      };

      // Mock the Supabase response for stale tracks check
      vi.mocked(supabase.from('tracks').select).mockReturnValue({
        // @ts-ignore
        eq: (col, val) => ({
            eq: () => Promise.resolve({ data: [staleTrack], error: null })
        })
      });

      renderHook(() => useTrackSync('user-1'), { wrapper });

      await waitFor(() => {
          const { toast } = require('@/hooks/use-toast');
          expect(toast).toHaveBeenCalledWith(expect.objectContaining({
              title: expect.stringContaining('Незавершённые треки'),
          }));
      });
  });
});
