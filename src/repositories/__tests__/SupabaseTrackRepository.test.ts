/**
 * Unit tests for SupabaseTrackRepository
 * Tests Repository Pattern implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseTrackRepository } from '../SupabaseTrackRepository';
import type { Track } from '@/types/domain/track.types';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('SupabaseTrackRepository', () => {
  let repository: SupabaseTrackRepository;
  let mockSupabase: any;

  beforeEach(() => {
    repository = new SupabaseTrackRepository();
    mockSupabase = require('@/integrations/supabase/client').supabase;
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should fetch all tracks', async () => {
      const mockTracks = [
        { 
          id: '1', 
          title: 'Track 1', 
          user_id: 'user1',
          status: 'completed',
          created_at: '2025-01-01T00:00:00Z'
        },
        { 
          id: '2', 
          title: 'Track 2', 
          user_id: 'user1',
          status: 'completed',
          created_at: '2025-01-02T00:00:00Z'
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTracks, error: null }),
      });

      const tracks = await repository.findAll();

      expect(tracks).toHaveLength(2);
      expect(tracks[0].title).toBe('Track 1');
      expect(mockSupabase.from).toHaveBeenCalledWith('tracks');
    });

    it('should filter by search query', async () => {
      const mockTracks = [
        { 
          id: '1', 
          title: 'Summer Vibes', 
          user_id: 'user1',
          status: 'completed',
          created_at: '2025-01-01T00:00:00Z'
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockTracks, error: null }),
      });

      const tracks = await repository.findAll({ search: 'summer' });

      expect(tracks).toHaveLength(1);
      expect(tracks[0].title).toBe('Summer Vibes');
    });

    it('should filter by status', async () => {
      const mockTracks = [
        { 
          id: '1', 
          title: 'Processing Track', 
          user_id: 'user1',
          status: 'processing',
          created_at: '2025-01-01T00:00:00Z'
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockTracks, error: null }),
      });

      const tracks = await repository.findAll({ status: 'processing' });

      expect(tracks).toHaveLength(1);
      expect(tracks[0].status).toBe('processing');
    });
  });

  describe('findById', () => {
    it('should fetch track by ID', async () => {
      const mockTrack = {
        id: '1',
        title: 'Test Track',
        user_id: 'user1',
        status: 'completed',
        created_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTrack, error: null }),
      });

      const track = await repository.findById('1');

      expect(track).toBeDefined();
      expect(track?.id).toBe('1');
      expect(track?.title).toBe('Test Track');
    });

    it('should return null for non-existent track', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });

      const track = await repository.findById('non-existent');

      expect(track).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new track', async () => {
      const newTrack = {
        title: 'New Track',
        prompt: 'Epic music',
        user_id: 'user1',
        status: 'pending' as const,
      };

      const createdTrack = {
        id: '3',
        ...newTrack,
        created_at: '2025-01-03T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdTrack, error: null }),
      });

      const track = await repository.create(newTrack as Partial<Track>);

      expect(track.id).toBe('3');
      expect(track.title).toBe('New Track');
    });
  });

  describe('update', () => {
    it('should update track', async () => {
      const updates = { title: 'Updated Title' };
      const updatedTrack = {
        id: '1',
        title: 'Updated Title',
        user_id: 'user1',
        status: 'completed',
        created_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedTrack, error: null }),
      });

      const track = await repository.update('1', updates);

      expect(track.title).toBe('Updated Title');
    });
  });

  describe('delete', () => {
    it('should delete track', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await expect(repository.delete('1')).resolves.not.toThrow();
    });
  });

  describe('incrementPlayCount', () => {
    it('should increment play count', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await expect(repository.incrementPlayCount('1')).resolves.not.toThrow();
    });
  });
});
