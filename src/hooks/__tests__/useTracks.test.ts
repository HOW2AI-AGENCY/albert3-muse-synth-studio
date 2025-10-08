import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTracks } from '../useTracks';
import { ApiService } from '@/services/api.service';
import { supabase } from '@/integrations/supabase/client';
import { logInfo, logDebug } from '@/utils/logger';

// Mock dependencies
vi.mock('@/services/api.service', () => ({
  ApiService: {
    getUserTracks: vi.fn(),
    deleteTrack: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

const toastMock = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/utils/trackCache', () => ({
  trackCache: {
    setTracks: vi.fn(),
    removeTrack: vi.fn(),
    getTracks: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logDebug: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

describe('useTracks', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockTracks = [
    {
      id: 'track-1',
      title: 'Track 1',
      prompt: 'Test prompt 1',
      audio_url: 'https://example.com/track1.mp3',
      status: 'completed',
      created_at: '2024-01-15T12:00:00Z',
    },
    {
      id: 'track-2',
      title: 'Track 2',
      prompt: 'Test prompt 2',
      audio_url: 'https://example.com/track2.mp3',
      status: 'processing',
      created_at: '2024-01-15T13:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial Loading', () => {
    it('loads tracks on mount', async () => {
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(mockTracks as any);

      const { result } = renderHook(() => useTracks(undefined, { pollingEnabled: false }));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tracks).toHaveLength(2);
      expect(result.current.tracks[0].title).toBe('Track 1');
    });

    it('handles loading errors gracefully', async () => {
      vi.mocked(ApiService.getUserTracks).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTracks(undefined, { pollingEnabled: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tracks).toHaveLength(0);
    });

    it('sets empty tracks when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null as any },
        error: null,
      } as any);

      const { result } = renderHook(() => useTracks(undefined, { pollingEnabled: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tracks).toHaveLength(0);
      expect(ApiService.getUserTracks).not.toHaveBeenCalled();
    });
  });

  describe('Track Operations', () => {
    it('deletes track successfully', async () => {
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(mockTracks as any);
      vi.mocked(ApiService.deleteTrack).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTracks(undefined, { pollingEnabled: false }));

      await waitFor(() => {
        expect(result.current.tracks).toHaveLength(2);
      });

      await act(async () => {
        await result.current.deleteTrack('track-1');
      });

      expect(ApiService.deleteTrack).toHaveBeenCalledWith('track-1');

      await waitFor(() => {
        expect(result.current.tracks.some(track => track.id === 'track-1')).toBe(false);
      });

      expect(result.current.tracks).toHaveLength(1);
      expect(result.current.tracks[0].id).toBe('track-2');
    });

    it('handles delete errors', async () => {
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(mockTracks as any);
      vi.mocked(ApiService.deleteTrack).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useTracks(undefined, { pollingEnabled: false }));

      await waitFor(() => {
        expect(result.current.tracks).toHaveLength(2);
      });

      await result.current.deleteTrack('track-1');

      // Track should still be in the list after failed deletion
      expect(result.current.tracks).toHaveLength(2);
    });

    it('refreshes tracks when called', async () => {
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(mockTracks as any);

      const { result } = renderHook(() => useTracks(undefined, { pollingEnabled: false }));

      await waitFor(() => {
        expect(result.current.tracks).toHaveLength(2);
      });

      // Change mock data
      const updatedTracks = [...mockTracks, {
        id: 'track-3',
        title: 'Track 3',
        status: 'completed',
        created_at: '2024-01-15T14:00:00Z',
      }];
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(updatedTracks as any);

      await act(async () => {
        await result.current.refreshTracks();
      });

      await waitFor(() => {
        expect(result.current.tracks).toHaveLength(3);
      });
    });
  });

  describe('Refresh Trigger', () => {
    it('reloads tracks when refresh trigger changes', async () => {
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(mockTracks as any);

      const { rerender } = renderHook(
        ({ trigger }) => useTracks(trigger, { pollingEnabled: false }),
        { initialProps: { trigger: 1 } }
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(ApiService.getUserTracks).toHaveBeenCalled();

      const initialCallCount = vi.mocked(ApiService.getUserTracks).mock.calls.length;

      // Change trigger
      rerender({ trigger: 2 });

      await waitFor(() => {
        expect(vi.mocked(ApiService.getUserTracks).mock.calls.length).toBe(initialCallCount + 1);
      });
    });
  });

  describe('Polling for Processing Tracks', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('polls when there are processing tracks', async () => {
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(mockTracks as any);

      const { unmount } = renderHook(() =>
        useTracks(undefined, { pollingInitialDelay: 10, pollingMaxDelay: 10 })
      );

      await Promise.resolve();
      expect(ApiService.getUserTracks).toHaveBeenCalled();

      const logInfoMock = vi.mocked(logInfo);
      const logDebugMock = vi.mocked(logDebug);

      await act(async () => {
        await Promise.resolve();
      });
      expect(logInfoMock).toHaveBeenCalled();

      const [, infoContext, infoData] = logInfoMock.mock.calls.at(-1)!;

      expect(infoContext).toBe('useTracks');
      expect(infoData).toMatchObject({
        attempt: 1,
        pendingTracks: expect.arrayContaining([
          expect.objectContaining({ id: 'track-2', status: 'processing' })
        ]),
      });

      expect(vi.getTimerCount()).toBeGreaterThan(0);

      vi.runOnlyPendingTimers();

      await act(async () => {
        await Promise.resolve();
      });
      expect(logDebugMock).toHaveBeenCalled();

      const [, debugContext, debugData] = logDebugMock.mock.calls.at(-1)!;

      expect(debugContext).toBe('useTracks');
      expect(debugData).toMatchObject({
        attempt: 1,
        pendingTracks: expect.arrayContaining([
          expect.objectContaining({ id: 'track-2', status: 'processing' })
        ]),
      });

      unmount();
    });

    it('stops polling when no processing tracks', async () => {
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(mockTracks as any);

      const logInfoMock = vi.mocked(logInfo);

      const { result } = renderHook(() =>
        useTracks(undefined, { pollingInitialDelay: 10, pollingMaxDelay: 10 })
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(ApiService.getUserTracks).toHaveBeenCalled();

      expect(vi.getTimerCount()).toBeGreaterThan(0);

      const completedTracks = mockTracks.map(t => ({ ...t, status: 'completed' }));
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(completedTracks as any);

      await act(async () => {
        await result.current.refreshTracks();
      });

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await Promise.resolve();
      });
      expect(logInfoMock).toHaveBeenCalledWith(
        'Stopping track polling - no pending tracks',
        'useTracks',
        expect.objectContaining({ pendingTracks: [] })
      );

      expect(vi.getTimerCount()).toBe(0);
    });

    it('clears polling timer on unmount', async () => {
      vi.mocked(ApiService.getUserTracks).mockResolvedValue(mockTracks as any);
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      const { unmount } = renderHook(() =>
        useTracks(undefined, { pollingInitialDelay: 10, pollingMaxDelay: 10 })
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(ApiService.getUserTracks).toHaveBeenCalled();

      expect(vi.getTimerCount()).toBeGreaterThan(0);

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);

      clearTimeoutSpy.mockRestore();
    });
  });
});
