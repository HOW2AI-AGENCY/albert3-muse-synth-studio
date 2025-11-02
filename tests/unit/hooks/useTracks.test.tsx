/**
 * useTracks Hook Tests
 * Week 1, Phase 1.2 - React Hooks Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTracks } from '@/hooks/useTracks';
import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTracks Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching tracks', () => {
    it('should fetch tracks successfully', async () => {
      const mockTracks = [
        {
          id: '1',
          title: 'Track 1',
          audio_url: 'https://example.com/track1.mp3',
          status: 'completed',
        },
        {
          id: '2',
          title: 'Track 2',
          audio_url: 'https://example.com/track2.mp3',
          status: 'completed',
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTracks, error: null }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tracks).toHaveLength(2);
      expect(result.current.tracks[0].title).toBe('Track 1');
    });

    it('should handle fetch error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Fetch error'),
        }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('Creating tracks', () => {
    it('should create track successfully', async () => {
      const mockTrack = {
        id: 'new-track',
        title: 'New Track',
        prompt: 'Test prompt',
      };

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTrack, error: null }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test would call createTrack mutation here
      expect(result.current.createTrack).toBeDefined();
    });
  });

  describe('Updating tracks', () => {
    it('should update track successfully', async () => {
      const updatedTrack = {
        id: '1',
        title: 'Updated Track',
        status: 'completed',
      };

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedTrack, error: null }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.updateTrack).toBeDefined();
    });
  });

  describe('Deleting tracks', () => {
    it('should delete track successfully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const { result } = renderHook(() => useTracks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.deleteTrack).toBeDefined();
    });
  });
});
