import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackService } from '../track.service';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const mockTrackData = {
    id: 'track-1',
    user_id: 'user-1',
    title: 'Test Track',
    prompt: 'A test track',
    status: 'completed',
    audio_url: 'http://test.com/audio.mp3',
    cover_url: 'http://test.com/cover.png',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: false,
    like_count: 0,
    play_count: 0,
    download_count: 0,
    view_count: 0,
    has_stems: false,
    style_tags: [],
    metadata: {},
    track_versions: [],
  };

describe('TrackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserTracks', () => {
    it('should fetch tracks for a user', async () => {
      const select = vi.fn().mockReturnThis();
      const eq = vi.fn().mockReturnThis();
      const order = vi.fn().mockResolvedValue({ data: [mockTrackData], error: null });
      (supabase.from as vi.Mock).mockReturnValue({ select, eq, order });

      const tracks = await TrackService.getUserTracks('user-1');

      expect(supabase.from).toHaveBeenCalledWith('tracks');
      expect(select).toHaveBeenCalledWith(expect.stringContaining('*'));
      expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(tracks).toHaveLength(1);
      expect(tracks[0].title).toBe('Test Track');
    });

    it('should throw an error if supabase fails', async () => {
        const select = vi.fn().mockReturnThis();
        const eq = vi.fn().mockReturnThis();
        const order = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') });
        (supabase.from as vi.Mock).mockReturnValue({ select, eq, order });

        await expect(TrackService.getUserTracks('user-1')).rejects.toThrow('DB Error');
      });
  });

  describe('deleteTrack', () => {
    it('should delete a track by id', async () => {
        const deleteFn = vi.fn().mockReturnThis();
        const eq = vi.fn().mockResolvedValue({ error: null });
        (supabase.from as vi.Mock).mockReturnValue({ delete: deleteFn, eq });

        await TrackService.deleteTrack('track-1');

        expect(supabase.from).toHaveBeenCalledWith('tracks');
        expect(deleteFn).toHaveBeenCalled();
        expect(eq).toHaveBeenCalledWith('id', 'track-1');
      });

      it('should throw an error if delete fails', async () => {
        const deleteFn = vi.fn().mockReturnThis();
        const eq = vi.fn().mockResolvedValue({ error: new Error('DB Error') });
        (supabase.from as vi.Mock).mockReturnValue({ delete: deleteFn, eq });

        await expect(TrackService.deleteTrack('track-1')).rejects.toThrow('DB Error');
      });
  });
});
