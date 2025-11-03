/**
 * Data fetching layer for tracks (uses Repository Pattern)
 * Handles React Query integration for track data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTrackRepository } from '@/repositories';
import type { TrackFilters } from '@/types/domain/track.types';

export interface UseTracksQueryOptions {
  /** Filter options */
  search?: string;
  status?: string;
  /** Enable/disable query */
  enabled?: boolean;
  /** Stale time in milliseconds */
  staleTime?: number;
}

/**
 * Fetch tracks with React Query caching
 */
export const useTracksQuery = (options: UseTracksQueryOptions = {}) => {
  const repository = getTrackRepository();

  return useQuery({
    queryKey: ['tracks', options.search, options.status],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      return repository.findByUserId(user.id, {
        search: options.search,
        status: options.status,
      } as TrackFilters);
    },
    staleTime: options.staleTime || 30000,
    enabled: options.enabled !== false,
  });
};

/**
 * Fetch single track by ID
 */
export const useTrackQuery = (trackId: string | null) => {
  const repository = getTrackRepository();

  return useQuery({
    queryKey: ['track', trackId],
    queryFn: () => repository.findById(trackId!),
    enabled: !!trackId,
    staleTime: 60000, // 1 minute
  });
};
