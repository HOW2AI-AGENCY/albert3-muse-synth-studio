/**
 * Repository exports and factory
 */
export { SupabaseTrackRepository } from './SupabaseTrackRepository';
export { MockTrackRepository } from './MockTrackRepository';
export type { ITrackRepository } from './interfaces/TrackRepository';

import { SupabaseTrackRepository } from './SupabaseTrackRepository';
import { MockTrackRepository } from './MockTrackRepository';
import type { ITrackRepository } from './interfaces/TrackRepository';

/**
 * Create track repository instance based on environment
 */
export const createTrackRepository = (): ITrackRepository => {
  // Use mock in test environment
  if (import.meta.env.MODE === 'test') {
    return new MockTrackRepository();
  }
  
  // Use Supabase in production/development
  return new SupabaseTrackRepository();
};

/**
 * Singleton instance
 */
let trackRepositoryInstance: ITrackRepository | null = null;

export const getTrackRepository = (): ITrackRepository => {
  if (!trackRepositoryInstance) {
    trackRepositoryInstance = createTrackRepository();
  }
  return trackRepositoryInstance;
};

/**
 * Reset singleton (useful for testing)
 */
export const resetTrackRepository = (): void => {
  trackRepositoryInstance = null;
};
