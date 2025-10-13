import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsService, viewSessionGuard } from '../analytics.service';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viewSessionGuard.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordPlay', () => {
    it('should call increment_play_count RPC', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      await AnalyticsService.recordPlay('track-123');

      expect(mockRpc).toHaveBeenCalledWith('increment_play_count', {
        track_id: 'track-123',
      });
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('RPC failed');
      vi.mocked(supabase.rpc).mockResolvedValue({ error: mockError });

      await expect(
        AnalyticsService.recordPlay('track-123')
      ).resolves.not.toThrow();
    });
  });

  describe('recordView', () => {
    it('should skip if trackId is empty', async () => {
      const mockRpc = vi.fn();
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      await AnalyticsService.recordView('');

      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should skip if view already recorded in session', async () => {
      const mockRpc = vi.fn();
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);
      
      viewSessionGuard.add('track-123');

      await AnalyticsService.recordView('track-123');

      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should call increment_view_count and mark as viewed', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      await AnalyticsService.recordView('track-123');

      expect(mockRpc).toHaveBeenCalledWith('increment_view_count', {
        track_id: 'track-123',
      });
      expect(viewSessionGuard.has('track-123')).toBe(true);
    });
  });

  describe('hasRecordedView', () => {
    it('should return true if view was recorded', () => {
      viewSessionGuard.add('track-123');
      expect(AnalyticsService.hasRecordedView('track-123')).toBe(true);
    });

    it('should return false if view was not recorded', () => {
      expect(AnalyticsService.hasRecordedView('track-456')).toBe(false);
    });
  });

  describe('markViewRecorded', () => {
    it('should add trackId to session guard', () => {
      AnalyticsService.markViewRecorded('track-123');
      expect(viewSessionGuard.has('track-123')).toBe(true);
    });
  });

  describe('getTrackAnalytics', () => {
    it('should fetch and return track analytics', async () => {
      const mockData = {
        view_count: 100,
        play_count: 50,
        like_count: 10,
        created_at: '2025-01-01T00:00:00Z',
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await AnalyticsService.getTrackAnalytics('track-123');

      expect(result).toEqual({
        plays: 50,
        views: 100,
        likes: 10,
        createdAt: '2025-01-01T00:00:00Z',
      });
    });

    it('should return zeros on error', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ 
            data: null, 
            error: new Error('Not found') 
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await AnalyticsService.getTrackAnalytics('track-123');

      expect(result).toEqual({
        plays: 0,
        views: 0,
        likes: 0,
        createdAt: null,
      });
    });
  });

  describe('getMostPlayedTracks', () => {
    it('should fetch most played tracks with default limit', async () => {
      const mockTracks = [
        { id: '1', title: 'Track 1', play_count: 100 },
        { id: '2', title: 'Track 2', play_count: 50 },
      ];

      const mockLimit = vi.fn().mockResolvedValue({ data: mockTracks, error: null });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await AnalyticsService.getMostPlayedTracks('user-123');

      expect(result).toEqual(mockTracks);
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should use custom limit', async () => {
      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await AnalyticsService.getMostPlayedTracks('user-123', 5);

      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });

  describe('getUserStats', () => {
    it('should aggregate user stats correctly', async () => {
      const mockTracks = [
        { view_count: 100, play_count: 50, like_count: 10 },
        { view_count: 200, play_count: 75, like_count: 20 },
        { view_count: null, play_count: 25, like_count: null },
      ];

      const mockEq = vi.fn().mockResolvedValue({ data: mockTracks, error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await AnalyticsService.getUserStats('user-123');

      expect(result).toEqual({
        totalTracks: 3,
        totalViews: 300,
        totalPlays: 150,
        totalLikes: 30,
      });
    });

    it('should return zeros on error', async () => {
      const mockEq = vi.fn().mockResolvedValue({ 
        data: null, 
        error: new Error('Failed') 
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await AnalyticsService.getUserStats('user-123');

      expect(result).toEqual({
        totalTracks: 0,
        totalViews: 0,
        totalPlays: 0,
        totalLikes: 0,
      });
    });
  });
});
