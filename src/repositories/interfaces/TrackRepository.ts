/**
 * 🔒 CRITICAL: PROTECTED INTERFACE - DO NOT MODIFY WITHOUT TEAM LEAD APPROVAL
 * 
 * Repository Pattern interface for Track operations
 * Abstracts data access layer from business logic
 * 
 * @version 1.0.0
 * @protected
 * @critical
 */

import type { Track, TrackFilters, TrackVersion, TrackStem } from '@/types/domain/track.types';

/**
 * Abstract Track Repository Interface
 * Implementation-agnostic (Supabase, REST API, Mock, etc.)
 */
export interface ITrackRepository {
  /**
   * Fetch tracks with optional filters
   */
  findAll(filters?: TrackFilters): Promise<Track[]>;

  /**
   * Fetch single track by ID
   */
  findById(id: string): Promise<Track | null>;

  /**
   * Fetch tracks by user ID
   */
  findByUserId(userId: string, filters?: TrackFilters): Promise<Track[]>;

  /**
   * Create new track
   */
  create(track: Partial<Track>): Promise<Track>;

  /**
   * Update existing track
   */
  update(id: string, updates: Partial<Track>): Promise<Track>;

  /**
   * Delete track
   */
  delete(id: string): Promise<void>;

  /**
   * Fetch track versions (variants)
   */
  findVersions(trackId: string): Promise<TrackVersion[]>;

  /**
   * Fetch track stems
   */
  findStems(trackId: string): Promise<TrackStem[]>;

  /**
   * Increment play count
   */
  incrementPlayCount(id: string): Promise<void>;

  /**
   * Increment like count
   */
  incrementLikeCount(id: string): Promise<void>;

  /**
   * Decrement like count
   */
  decrementLikeCount(id: string): Promise<void>;

  /**
   * Subscribe to track updates (realtime)
   */
  subscribe(
    trackId: string,
    callback: (track: Track) => void
  ): () => void;
}

/**
 * Repository factory for dependency injection
 */
export interface ITrackRepositoryFactory {
  create(): ITrackRepository;
}
