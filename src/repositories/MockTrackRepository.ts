/**
 * Mock implementation of Track Repository for testing
 */
import type { ITrackRepository } from './interfaces/TrackRepository';
import type { Track, TrackFilters, TrackVersion, TrackStem } from '@/types/domain/track.types';

export class MockTrackRepository implements ITrackRepository {
  private tracks: Track[] = [];
  private versions: TrackVersion[] = [];
  private stems: TrackStem[] = [];

  constructor(initialTracks: Track[] = []) {
    this.tracks = initialTracks;
  }

  async findAll(filters?: TrackFilters): Promise<Track[]> {
    let result = [...this.tracks];

    if (filters?.provider) {
      result = result.filter(t => t.provider === filters.provider);
    }
    if (filters?.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters?.has_vocals !== undefined) {
      result = result.filter(t => t.has_vocals === filters.has_vocals);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(search) || 
        (t.prompt || '').toLowerCase().includes(search)
      );
    }

    return result;
  }

  async findById(id: string): Promise<Track | null> {
    return this.tracks.find(t => t.id === id) || null;
  }

  async findByUserId(userId: string, filters?: TrackFilters): Promise<Track[]> {
    const userTracks = this.tracks.filter(t => t.user_id === userId);
    
    if (!filters) return userTracks;

    // Apply same filters as findAll
    let result = userTracks;
    if (filters.provider) result = result.filter(t => t.provider === filters.provider);
    if (filters.status) result = result.filter(t => t.status === filters.status);
    
    return result;
  }

  async create(track: Partial<Track>): Promise<Track> {
    const newTrack: Track = {
      id: Math.random().toString(36).substring(7),
      user_id: track.user_id || 'mock-user',
      title: track.title || 'Untitled',
      prompt: track.prompt || '',
      status: track.status || 'pending',
      provider: track.provider || 'suno',
      has_vocals: track.has_vocals ?? false,
      has_stems: track.has_stems ?? false,
      is_public: track.is_public ?? false,
      play_count: 0,
      like_count: 0,
      download_count: 0,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...track,
    } as Track;

    this.tracks.push(newTrack);
    return newTrack;
  }

  async update(id: string, updates: Partial<Track>): Promise<Track> {
    const index = this.tracks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Track not found');

    this.tracks[index] = {
      ...this.tracks[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return this.tracks[index];
  }

  async delete(id: string): Promise<void> {
    const index = this.tracks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Track not found');
    this.tracks.splice(index, 1);
  }

  async findVersions(trackId: string): Promise<TrackVersion[]> {
    return this.versions.filter(v => v.parent_track_id === trackId);
  }

  async findStems(trackId: string): Promise<TrackStem[]> {
    return this.stems.filter(s => s.track_id === trackId);
  }

  async incrementPlayCount(id: string): Promise<void> {
    const track = this.tracks.find(t => t.id === id);
    if (track) {
      track.play_count = (track.play_count ?? 0) + 1;
    }
  }

  async incrementLikeCount(id: string): Promise<void> {
    const track = this.tracks.find(t => t.id === id);
    if (track) {
      track.like_count = (track.like_count ?? 0) + 1;
    }
  }

  async decrementLikeCount(id: string): Promise<void> {
    const track = this.tracks.find(t => t.id === id);
    if (track) {
      track.like_count = Math.max(0, (track.like_count ?? 0) - 1);
    }
  }

  subscribe(_trackId: string, _callback: (track: Track) => void): () => void {
    // Mock: no-op
    return () => {};
  }
}
