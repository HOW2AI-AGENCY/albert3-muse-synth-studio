/**
 * ✅ NEW: useTrackVariantsBatch Hook
 *
 * PERFORMANCE OPTIMIZATION: Batch loading of track variants
 *
 * This hook solves the N+1 query problem when loading variants for multiple tracks.
 * Instead of making 25 separate database queries (one per track), it makes a single
 * batched query for all tracks at once.
 *
 * BEFORE:
 * ```tsx
 * tracks.map(track => {
 *   const { data } = useTrackVariants(track.id); // 25 queries!
 * });
 * ```
 *
 * AFTER:
 * ```tsx
 * const trackIds = tracks.map(t => t.id);
 * const { data: variantsByTrackId } = useTrackVariantsBatch(trackIds); // 1 query!
 *
 * tracks.map(track => {
 *   const variants = variantsByTrackId?.[track.id] || [];
 * });
 * ```
 *
 * Key benefits:
 * - 🚀 Reduces database queries from N to 1
 * - ⚡ Dramatically improves page load performance
 * - 💰 Reduces Supabase database usage
 * - 🎯 Maintains React Query caching benefits
 *
 * Implementation:
 * - Uses Supabase `.in()` for batched query
 * - Returns Record<trackId, TrackVariant[]>
 * - Includes same caching strategy as useTrackVariants
 * - Compatible with existing TrackVariant type
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logInfo, logError } from '@/utils/logger';
import type { TrackVariant, TrackMetadata } from '../api/trackVersions';
import type { Database } from '@/integrations/supabase/types';

type TrackVersionRow = Database['public']['Tables']['track_versions']['Row'];

/**
 * Result type for batch query
 * Maps track ID to its array of variants
 */
export interface TrackVariantsBatchResult {
  [trackId: string]: TrackVariant[];
}

/**
 * ✅ NEW: Hook to batch fetch track variants for multiple tracks
 *
 * @param trackIds - Array of track IDs to fetch variants for
 * @param enabled - Whether the query should run (defaults to true)
 * @returns React Query result with variants grouped by track ID
 *
 * @example
 * ```tsx
 * const trackIds = tracks.map(t => t.id);
 * const { data, isLoading, error } = useTrackVariantsBatch(trackIds);
 *
 * // Access variants for a specific track
 * const track1Variants = data?.[trackIds[0]] || [];
 * ```
 */
export function useTrackVariantsBatch(
  trackIds: string[],
  enabled: boolean = true
) {
  // Create stable query key
  const sortedIds = [...trackIds].sort();
  const queryKey = ['track-variants-batch', sortedIds];

  return useQuery<TrackVariantsBatchResult>({
    queryKey,
    queryFn: async () => {
      logInfo('Fetching track variants batch via React Query', 'useTrackVariantsBatch', {
        trackCount: trackIds.length,
        trackIds: trackIds.slice(0, 5), // Log first 5 for debugging
      });

      if (trackIds.length === 0) {
        return {};
      }

      try {
        // ✅ CRITICAL: Single batched query instead of N queries
        const { data: dbVersions, error } = await supabase
          .from('track_versions')
          .select('*, suno_id')
          .in('parent_track_id', trackIds) // Batch query!
          .gte('variant_index', 1) // Only load variants >= 1
          .order('parent_track_id', { ascending: true })
          .order('variant_index', { ascending: true })
          .returns<TrackVersionRow[]>();

        if (error) {
          logError('Failed to fetch track variants batch', error as Error, 'useTrackVariantsBatch', {
            trackIds: trackIds.slice(0, 5),
          });
          throw error;
        }

        // Group variants by parent_track_id
        const variantsByTrackId: TrackVariantsBatchResult = {};

        // Initialize empty arrays for all requested tracks
        trackIds.forEach(trackId => {
          variantsByTrackId[trackId] = [];
        });

        // Populate variants
        (dbVersions || []).forEach(version => {
          const trackId = version.parent_track_id;

          if (!variantsByTrackId[trackId]) {
            variantsByTrackId[trackId] = [];
          }

          const variant: TrackVariant = {
            id: version.id,
            parentTrackId: trackId,
            variantIndex: version.variant_index ?? 1,
            isPreferredVariant: Boolean(version.is_preferred_variant),
            likeCount: typeof version.like_count === 'number' ? version.like_count : undefined,
            audioUrl: version.audio_url || undefined,
            coverUrl: version.cover_url || undefined,
            videoUrl: version.video_url || undefined,
            duration: version.duration || undefined,
            lyrics: version.lyrics || undefined,
            sunoId: version.suno_id || undefined,
            metadata: (version.metadata as TrackMetadata | null) || null,
            createdAt: version.created_at,
          };

          variantsByTrackId[trackId].push(variant);
        });

        logInfo('Track variants batch loaded successfully', 'useTrackVariantsBatch', {
          trackCount: trackIds.length,
          totalVariants: dbVersions?.length || 0,
          tracksWithVariants: Object.values(variantsByTrackId).filter(v => v.length > 0).length,
        });

        return variantsByTrackId;
      } catch (error) {
        logError('Failed to fetch track variants batch', error as Error, 'useTrackVariantsBatch', {
          trackIds: trackIds.slice(0, 5),
        });
        throw error;
      }
    },
    enabled: enabled && trackIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes - same as useTrackVariants
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}

/**
 * ✅ Helper: Extract variants for a specific track from batch result
 *
 * @param batchData - Result from useTrackVariantsBatch
 * @param trackId - ID of track to get variants for
 * @returns Array of variants for the track, or empty array
 */
export function getTrackVariantsFromBatch(
  batchData: TrackVariantsBatchResult | undefined,
  trackId: string
): TrackVariant[] {
  if (!batchData) return [];
  return batchData[trackId] || [];
}

/**
 * ✅ Helper: Get preferred variant for a track from batch result
 *
 * @param batchData - Result from useTrackVariantsBatch
 * @param trackId - ID of track to get preferred variant for
 * @returns Preferred variant or null
 */
export function getPreferredVariantFromBatch(
  batchData: TrackVariantsBatchResult | undefined,
  trackId: string
): TrackVariant | null {
  const variants = getTrackVariantsFromBatch(batchData, trackId);
  return variants.find(v => v.isPreferredVariant) || null;
}

/**
 * ✅ Helper: Check if track has variants in batch result
 *
 * @param batchData - Result from useTrackVariantsBatch
 * @param trackId - ID of track to check
 * @returns True if track has any variants
 */
export function hasVariantsInBatch(
  batchData: TrackVariantsBatchResult | undefined,
  trackId: string
): boolean {
  const variants = getTrackVariantsFromBatch(batchData, trackId);
  return variants.length > 0;
}
