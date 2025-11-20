/**
 * Unit Tests: useTracks Hook
 * TEST-006: React Hooks Unit Tests (6h)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTracks } from '@/hooks/useTracks';
import { supabase } from '@/integrations/supabase/client';
import { ApiService } from '@/services/api.service';
import { trackCacheService } from '@/services/track-cache.service';

// Create local AuthContext for tests
const AuthContext = React.createContext<{
  user: any;
  userId: string | null;
  session: any;
  isLoading: boolean;
  refresh: () => void;
}>({
  user: null,
  userId: null,
  session: null,
  isLoading: false,
  refresh: () => {},
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/services/track-cache.service', () => ({
  trackCacheService: {
    setActiveUser: vi.fn(),
    cacheTracks: vi.fn(),
    removeTrack: vi.fn(),
    clearAll: vi.fn(),
  },
}));

const createSupabaseBuilder = (data: any[], overrides: Record<string, any> = {}) => {
  let signal: AbortSignal | undefined;

  const builder: any = {
    select: vi.fn((...args: any[]) => {
      console.log('[TEST MOCK] select called with args:', args.length);
      return builder;
    }),
    eq: vi.fn((field: string, value: any) => {
      console.log('[TEST MOCK] eq called:', field, value);
      return builder;
    }),
    neq: vi.fn((field: string, value: any) => {
      console.log('[TEST MOCK] neq called:', field, value);
      return builder;
    }),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    abortSignal: vi.fn((s: AbortSignal) => {
      console.log('[TEST MOCK] abortSignal called');
      signal = s;
      return builder;
    }),
    then: (onFulfilled: any, onRejected?: any) => {
      console.log('[TEST MOCK] builder.then() called, data length:', data.length);
      if (signal?.aborted) {
        console.log('[TEST MOCK] Signal was aborted, returning empty data');
        return Promise.resolve({ data: [], error: null, count: 0 }).then(onFulfilled, onRejected);
      }
      return Promise.resolve({ data, error: null, count: data.length }).then(onFulfilled, onRejected);
    },
  };

  Object.assign(builder, overrides);
  return builder;
};

const createWrapper = (authOverrides?: Partial<React.ContextType<typeof AuthContext>>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const userOverride = authOverrides && 'user' in authOverrides ? authOverrides.user ?? null : ({ id: 'user-123' } as any);
  const userIdOverride = authOverrides && 'userId' in authOverrides ? authOverrides.userId ?? null : 'user-123';

  const authValue: React.ContextType<typeof AuthContext> = {
    user: userOverride,
    userId: userIdOverride,
    session: authOverrides?.session ?? null,
    isLoading: authOverrides?.isLoading ?? false,
    refresh: authOverrides?.refresh ?? vi.fn(),
  };

  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe('useTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads tracks for authenticated user', async () => {
    const mockTracks = [
      {
        id: 'track-1',
        title: 'Test Track',
        status: 'completed',
        user_id: 'user-123',
        created_at: new Date().toISOString(),
        track_versions: [],
        track_stems: [],
        profiles: { id: 'user-123', full_name: 'Test User' },
      },
    ];

    const builder = createSupabaseBuilder(mockTracks);
    vi.mocked(supabase.from).mockReturnValue(builder);
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    } as any);

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useTracks(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0].title).toBe('Test Track');

    queryClient.clear();
  });

  it('returns empty list when user is missing', async () => {
    const builder = createSupabaseBuilder([]);
    vi.mocked(supabase.from).mockReturnValue(builder);
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    } as any);

    const { wrapper, queryClient } = createWrapper({ userId: null, user: null });
    const { result } = renderHook(() => useTracks(), { wrapper });

    await waitFor(() => expect(result.current.tracks).toHaveLength(0));
    expect(trackCacheService.setActiveUser).toHaveBeenLastCalledWith(null);

    queryClient.clear();
  });

  it('applies project filter and excludes drafts', async () => {
    const builder = createSupabaseBuilder([]);
    vi.mocked(supabase.from).mockReturnValue(builder);
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    } as any);

    const { wrapper, queryClient } = createWrapper();
    renderHook(() => useTracks(undefined, { projectId: 'project-1', excludeDraftTracks: true }), { wrapper });

    await waitFor(() => {
      expect(builder.eq).toHaveBeenCalledWith('project_id', 'project-1');
      expect(builder.neq).toHaveBeenCalledWith('status', 'draft');
    });

    queryClient.clear();
  });

  it('removes track from result after deletion', async () => {
    const mockTracks = [
      { id: 'track-1', title: 'First', status: 'completed', user_id: 'user-123', created_at: new Date().toISOString() },
      { id: 'track-2', title: 'Second', status: 'completed', user_id: 'user-123', created_at: new Date().toISOString() },
    ];

    const builder = createSupabaseBuilder(mockTracks);
    vi.mocked(supabase.from).mockReturnValue(builder);
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    } as any);
    vi.spyOn(ApiService, 'deleteTrack').mockResolvedValue();

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useTracks(), { wrapper });

    await waitFor(() => expect(result.current.tracks).toHaveLength(2));

    await result.current.deleteTrack('track-1');

    expect(ApiService.deleteTrack).toHaveBeenCalledWith('track-1');
    expect(trackCacheService.removeTrack).toHaveBeenCalledWith('track-1');

    await waitFor(() => {
      expect(result.current.tracks.some((track) => track.id === 'track-1')).toBe(false);
    });

    queryClient.clear();
  });
});
