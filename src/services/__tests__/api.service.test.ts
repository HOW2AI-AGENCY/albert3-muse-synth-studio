// src/services/__tests__/api.service.test.ts
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ApiService, mapTrackRowToTrack } from '../api.service';
import { supabase } from '@/integrations/supabase/client';
import { handlePostgrestError } from '../api/errors';

// Mock the error handler to spy on it
vi.mock('../api/errors', () => ({
  handlePostgrestError: vi.fn((error, message) => {
    if (error) {
      throw new Error(`${message}: ${error.message}`);
    }
  }),
  handleSupabaseFunctionError: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

// Create a mock track row to use in tests
const mockTrackRow = {
  id: 'track-123',
  user_id: 'user-abc',
  title: 'Test Track',
  prompt: 'A test prompt',
  status: 'completed' as const,
  audio_url: 'http://example.com/audio.mp3',
  cover_url: 'http://example.com/cover.jpg',
  video_url: null,
  error_message: null,
  provider: 'suno',
  lyrics: 'Test lyrics',
  style_tags: ['synthwave', '80s'],
  genre: 'Electronic',
  mood: 'Energetic',
  duration: 180,
  duration_seconds: 180,
  has_vocals: true,
  is_public: true,
  metadata: { custom: 'data' },
  suno_id: 'suno-xyz',
  model_name: 'v3.5',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_at_suno: null,
  has_stems: false,
  like_count: 10,
  play_count: 100,
  download_count: 5,
  view_count: 200,
  reference_audio_url: null,
  progress_percent: 100,
  idempotency_key: 'key-123',
  archived_to_storage: false,
  storage_audio_url: null,
  storage_cover_url: null,
  storage_video_url: null,
  archive_scheduled_at: null,
  archived_at: null,
  mureka_task_id: null,
  project_id: 'proj-456',
  improved_prompt: 'An improved test prompt',
  track_versions: [], // For TrackRowWithVersions
};

describe('ApiService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('mapTrackRowToTrack', () => {
    it('should correctly transform a database track row to a domain model track', () => {
      const track = mapTrackRowToTrack(mockTrackRow);

      expect(track.id).toBe(mockTrackRow.id);
      expect(track.title).toBe(mockTrackRow.title);
      expect(track.status).toBe('completed');
      expect(track.metadata).toEqual({ custom: 'data' });
      // Ensure versions is an empty array if not provided
      expect(track.versions).toEqual([]);
    });

    it('should handle nested track_versions correctly', () => {
      const rowWithVersions = {
        ...mockTrackRow,
        track_versions: [{ id: 'v1', audio_url: 'url1' }, { id: 'v2', audio_url: 'url2' }],
      };
      const track = mapTrackRowToTrack(rowWithVersions as any);
      expect(track.versions).toHaveLength(2);
      expect(track.versions?.[0].id).toBe('v1');
    });

    it('should default status to "pending" for invalid status values', () => {
      const invalidStatusRow = { ...mockTrackRow, status: 'unknown_status' as any };
      const track = mapTrackRowToTrack(invalidStatusRow);
      expect(track.status).toBe('pending');
    });
  });

  describe('getUserTracks', () => {
    it('should fetch and transform user tracks correctly', async () => {
      const mockSelect = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockTrackRow], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelect),
      } as any);

      const tracks = await ApiService.getUserTracks('user-abc');

      expect(supabase.from).toHaveBeenCalledWith('tracks');
      expect(mockSelect.eq).toHaveBeenCalledWith('user_id', 'user-abc');
      expect(mockSelect.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(tracks).toHaveLength(1);
      expect(tracks[0].id).toBe(mockTrackRow.id);
      expect(tracks[0].title).toBe('Test Track');
    });

    it('should handle errors when fetching tracks', async () => {
      const mockError = { message: 'Permission denied', details: '', hint: '', code: '42501' };
      const mockSelect = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelect),
      } as any);

      await expect(ApiService.getUserTracks('user-abc')).rejects.toThrow(
        'Failed to fetch tracks: Permission denied'
      );
      expect(handlePostgrestError).toHaveBeenCalledWith(
        mockError,
        'Failed to fetch tracks',
        expect.any(String),
        { userId: 'user-abc' }
      );
    });
  });

  describe('deleteTrack', () => {
    it('should call the delete method with the correct trackId', async () => {
      const mockDelete = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue(mockDelete),
      } as any);

      await ApiService.deleteTrack('track-123');

      expect(supabase.from).toHaveBeenCalledWith('tracks');
      expect(mockDelete.eq).toHaveBeenCalledWith('id', 'track-123');
    });
  });
});