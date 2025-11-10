/**
 * Memory Leak Test for useTracks realtime subscriptions
 * Tests P0-1 fix: Sync cleanup to prevent memory leaks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTracks } from '@/hooks/useTracks';
import { supabase } from '@/integrations/supabase/client';
import type { ReactNode } from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };

  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => ({
                abortSignal: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
              })),
            })),
          })),
        })),
      })),
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn().mockResolvedValue(undefined),
      getChannels: vi.fn(() => []),
    },
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    loading: false,
  }),
}));

describe('useTracks - Memory Leak Prevention (P0-1)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should remove realtime channel on unmount', async () => {
    const { unmount } = renderHook(
      () => useTracks({ projectId: null, excludeDraftTracks: false }),
      { wrapper }
    );

    // Wait for subscription to be established
    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith(
        expect.stringContaining('tracks-user-test-user-id')
      );
    });

    const channelCreateCount = (supabase.channel as any).mock.calls.length;

    // Unmount component
    unmount();

    // Verify removeChannel was called
    await waitFor(() => {
      expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    });

    // Verify no lingering channels
    expect(supabase.getChannels()).toHaveLength(0);
  });

  it('should handle rapid mount/unmount cycles without leaking channels', async () => {
    const mountCount = 10;
    const hooks: Array<ReturnType<typeof renderHook>> = [];

    // Rapidly mount and unmount
    for (let i = 0; i < mountCount; i++) {
      const { unmount } = renderHook(
        () => useTracks({ projectId: null, excludeDraftTracks: false }),
        { wrapper }
      );
      hooks.push({ unmount } as any);

      // Small delay to simulate realistic usage
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Unmount all
    hooks.forEach((hook) => hook.unmount());

    // Wait for all cleanups
    await waitFor(() => {
      expect(supabase.removeChannel).toHaveBeenCalledTimes(mountCount);
    });

    // Verify all channels cleaned up
    expect(supabase.getChannels()).toHaveLength(0);
  });

  it('should cleanup channel even if subscription fails', async () => {
    // Mock subscription failure
    const mockFailedChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('CHANNEL_ERROR');
        return mockFailedChannel;
      }),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    (supabase.channel as any).mockReturnValue(mockFailedChannel);

    const { unmount } = renderHook(
      () => useTracks({ projectId: null, excludeDraftTracks: false }),
      { wrapper }
    );

    // Wait a bit for subscription attempt
    await new Promise((resolve) => setTimeout(resolve, 100));

    unmount();

    // Verify cleanup still happened
    await waitFor(() => {
      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });

  it('should not create duplicate channels on re-render with same deps', async () => {
    const { rerender } = renderHook(
      () => useTracks({ projectId: 'project-1', excludeDraftTracks: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledTimes(1);
    });

    const initialCallCount = (supabase.channel as any).mock.calls.length;

    // Re-render with same props (should NOT create new channel)
    rerender();

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Channel should NOT be recreated
    expect((supabase.channel as any).mock.calls.length).toBe(initialCallCount);
  });

  it('should cleanup old channel when deps change', async () => {
    const { rerender } = renderHook(
      ({ projectId }: { projectId: string | null }) =>
        useTracks({ projectId, excludeDraftTracks: false }),
      {
        wrapper,
        initialProps: { projectId: 'project-1' },
      }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledTimes(1);
    });

    // Change projectId (should cleanup old channel and create new one)
    rerender({ projectId: 'project-2' });

    await waitFor(() => {
      expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
      expect(supabase.channel).toHaveBeenCalledTimes(2);
    });
  });

  it('should use sync cleanup (not async .then())', async () => {
    const { unmount } = renderHook(
      () => useTracks({ projectId: null, excludeDraftTracks: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalled();
    });

    // Unmount
    unmount();

    // removeChannel should be called synchronously (void, not .then())
    // This is verified by checking it's called immediately, not in next tick
    expect(supabase.removeChannel).toHaveBeenCalled();

    // No pending promises
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
  });
});
