/**
 * Memory Leak Test for useTracks realtime subscriptions
 * Refactored to test the new RealtimeSubscriptionManager integration
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTracks } from '@/hooks/useTracks';
import RealtimeSubscriptionManager from '@/services/realtimeSubscriptionManager';
import type { ReactNode } from 'react';

// Mock the RealtimeSubscriptionManager
const mockUnsubscribe = vi.fn();
vi.mock('@/services/realtimeSubscriptionManager', () => ({
  default: {
    subscribeToUserTracks: vi.fn(() => mockUnsubscribe),
  },
}));

// EXPANDED MOCK: Provide all required logger functions to satisfy the module's contract
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
  logDebug: vi.fn(),
}));


// Mock auth context
vi.mock('@/contexts/auth/useAuth', () => ({
  useAuth: () => ({
    userId: 'test-user-id',
    isLoading: false,
  }),
}));

// Provide a minimal mock for supabase since useTracks still imports it
vi.mock('@/integrations/supabase/client', () => ({
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
  },
}));


describe('useTracks - RealtimeSubscriptionManager Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should subscribe to user tracks on mount', async () => {
    renderHook(() => useTracks(undefined, { projectId: 'project-1' }), { wrapper });

    await waitFor(() => {
      expect(RealtimeSubscriptionManager.subscribeToUserTracks).toHaveBeenCalledWith(
        'test-user-id',
        'project-1',
        expect.any(Function)
      );
    });
  });

  it('should call the unsubscribe function on unmount', async () => {
    const { unmount } = renderHook(() => useTracks(), { wrapper });

    await waitFor(() => {
      expect(RealtimeSubscriptionManager.subscribeToUserTracks).toHaveBeenCalledTimes(1);
    });

    unmount();

    await waitFor(() => {
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle rapid mount/unmount cycles correctly', async () => {
    const mountCount = 10;
    const hooks: Array<ReturnType<typeof renderHook>> = [];

    for (let i = 0; i < mountCount; i++) {
      hooks.push(renderHook(() => useTracks(), { wrapper }));
    }

    hooks.forEach((hook) => hook.unmount());

    await waitFor(() => {
      expect(RealtimeSubscriptionManager.subscribeToUserTracks).toHaveBeenCalledTimes(mountCount);
      expect(mockUnsubscribe).toHaveBeenCalledTimes(mountCount);
    });
  });

  it('should re-subscribe when projectId dependency changes', async () => {
    const { rerender } = renderHook(
      ({ projectId }) => useTracks(undefined, { projectId }),
      {
        wrapper,
        initialProps: { projectId: 'project-1' },
      }
    );

    await waitFor(() => {
      expect(RealtimeSubscriptionManager.subscribeToUserTracks).toHaveBeenCalledWith(
        'test-user-id',
        'project-1',
        expect.any(Function)
      );
    });

    expect(mockUnsubscribe).not.toHaveBeenCalled();

    rerender({ projectId: 'project-2' });

    await waitFor(() => {
      // Check that the old subscription was cleaned up
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      // Check that a new subscription was created with the new projectId
      expect(RealtimeSubscriptionManager.subscribeToUserTracks).toHaveBeenCalledWith(
        'test-user-id',
        'project-2',
        expect.any(Function)
      );
    });

    expect(RealtimeSubscriptionManager.subscribeToUserTracks).toHaveBeenCalledTimes(2);
  });

  it('should not re-subscribe on re-renders with the same dependencies', async () => {
    const { rerender } = renderHook(() => useTracks(undefined, { projectId: 'project-1' }), { wrapper });

    await waitFor(() => {
      expect(RealtimeSubscriptionManager.subscribeToUserTracks).toHaveBeenCalledTimes(1);
    });

    rerender();

    // Use a small timeout to ensure no async re-subscription happens
    await new Promise(res => setTimeout(res, 50));

    expect(RealtimeSubscriptionManager.subscribeToUserTracks).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });
});
