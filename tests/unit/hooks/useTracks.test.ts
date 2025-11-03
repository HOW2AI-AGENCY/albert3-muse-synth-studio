/**
 * Unit Tests: useTracks Hook
 * TEST-006: React Hooks Unit Tests (6h)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTracks } from '@/hooks/useTracks';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock IndexedDB cache
vi.mock('@/features/tracks', () => ({
  trackCacheIDB: {
    setTracks: vi.fn(),
    clearAll: vi.fn(),
    removeTrack: vi.fn(),
  },
}));

describe('useTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock: user is authenticated
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } as any },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should load tracks for authenticated user', async () => {
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

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockTracks, error: null }),
    } as any);

    const { result } = renderHook(() => useTracks());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0].title).toBe('Test Track');
  });

  it('should clear tracks when user is not authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useTracks());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tracks).toHaveLength(0);
  });

  it('should filter tracks by projectId', async () => {
    const mockTracks = [
      {
        id: 'track-1',
        project_id: 'project-1',
        title: 'Project Track',
        status: 'completed',
        user_id: 'user-123',
        created_at: new Date().toISOString(),
        track_versions: [],
        track_stems: [],
      },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockTracks, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    renderHook(() => useTracks(undefined, { projectId: 'project-1' }));

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('project_id', 'project-1');
    });
  });

  it('should exclude draft tracks when option is set', async () => {
    const mockNeq = vi.fn().mockReturnThis();
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: mockNeq,
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    renderHook(() => useTracks(undefined, { excludeDraftTracks: true }));

    await waitFor(() => {
      expect(mockNeq).toHaveBeenCalledWith('status', 'draft');
    });
  });

  it('should delete track and update state', async () => {
    const mockTracks = [
      { id: 'track-1', title: 'Track 1', status: 'completed', user_id: 'user-123', created_at: new Date().toISOString() },
      { id: 'track-2', title: 'Track 2', status: 'completed', user_id: 'user-123', created_at: new Date().toISOString() },
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockTracks, error: null }),
      delete: vi.fn().mockReturnThis(),
    } as any);

    const { result } = renderHook(() => useTracks());

    await waitFor(() => expect(result.current.tracks).toHaveLength(2));

    // Mock delete API
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    } as any);

    await result.current.deleteTrack('track-1');

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0].id).toBe('track-2');
  });

  it('should enable polling for processing tracks', async () => {
    vi.useFakeTimers();

    const mockTracks = [
      { id: 'track-1', title: 'Processing', status: 'processing', user_id: 'user-123', created_at: new Date().toISOString() },
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockTracks, error: null }),
    } as any);

    renderHook(() => useTracks());

    await waitFor(() => {
      expect(vi.mocked(supabase.from)).toHaveBeenCalled();
    });

    // Fast-forward 3 seconds (polling interval)
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(vi.mocked(supabase.from).mock.calls.length).toBeGreaterThan(1);
    });

    vi.useRealTimers();
  });

  it('should handle realtime updates', async () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback: any) => {
        callback('SUBSCRIBED');
        return mockChannel;
      }),
    };

    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const mockTracks = [
      { id: 'track-1', title: 'Track 1', status: 'completed', user_id: 'user-123', created_at: new Date().toISOString() },
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockTracks, error: null }),
    } as any);

    const { result } = renderHook(() => useTracks());

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    expect(result.current.tracks).toHaveLength(1);
  });
});
