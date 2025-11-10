/**
 * ✅ NEW: useTrackVariants Hook (Refactored with React Query)
 *
 * Replaces the old useTrackVersions and the intermediate useTrackVariants hooks.
 * This version is built on top of @tanstack/react-query for robust caching and data fetching.
 *
 * Key improvements:
 * - Powered by React Query: No more manual caching, listeners, or in-flight request tracking.
 * - Simplified API: Returns query results directly, plus a streamlined `setPreferred` mutation.
 * - Robust and Reliable: Leverages React Query's battle-tested engine for caching, refetching, and state management.
 * - Type-Safe: Works with the new `getTrackWithVariants` function and `TrackWithVariantsResult` type.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useTrackVariants(trackId);
 * const { mutate: setPreferred, isPending: isSettingPreferred } = useSetPreferredVariant();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * if (!data) return <p>Track not found</p>;
 *
 * return (
 *   <div>
 *     <h1>{data.mainTrack.title}</h1>
 *     <p>Variants: {data.variants.length}</p>
 *     <button onClick={() => setPreferred({ trackId, variantId: newVariant.id })}>
 *       Set Preferred
 *     </button>
 *   </div>
 * );
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTrackWithVariants,
  setMasterVersion as setMasterVersionApi,
  trackVersionsQueryKeys,
  unwrapResult,
} from '../api/trackVersions';
import { logInfo, logError } from '@/utils/logger';

/**
 * ✅ NEW: Hook to fetch track variants using React Query.
 *
 * @param trackId - The ID of the track to load variants for.
 * @param enabled - Whether the query should be enabled to run (defaults to true).
 * @returns The result of the React Query `useQuery` hook.
 */
export function useTrackVariants(trackId: string | null | undefined, enabled: boolean = true) {
  const queryKey = trackVersionsQueryKeys.list(trackId!);

  return useQuery({
    queryKey,
    queryFn: async () => {
      logInfo('Fetching track variants via React Query', 'useTrackVariants', { trackId });
      try {
        const data = await getTrackWithVariants(trackId!);
        return data;
      } catch (error) {
        logError('Failed to fetch track variants', error as Error, 'useTrackVariants', { trackId });
        throw error;
      }
    },
    enabled: !!trackId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}

interface SetPreferredVariantPayload {
  trackId: string;
  variantId: string;
}

/**
 * ✅ NEW: Hook to set a preferred variant using React Query's useMutation.
 *
 * This hook provides a `mutate` function to set the preferred variant and handles
 * automatic cache invalidation on success.
 *
 * @returns The result of the React Query `useMutation` hook.
 */
export function useSetPreferredVariant() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, SetPreferredVariantPayload>({
    mutationFn: async ({ trackId, variantId }) => {
      logInfo('Setting preferred variant', 'useSetPreferredVariant', { trackId, variantId });
      try {
        const result = await setMasterVersionApi(trackId, variantId);
        // unwrapResult will throw if the operation failed
        unwrapResult(result);
      } catch (error) {
        logError('Failed to set preferred variant', error as Error, 'useSetPreferredVariant', { trackId, variantId });
        // Re-throw the error to be handled by onError in the component
        throw error;
      }
    },
    onSuccess: (_, { trackId }) => {
      logInfo('Successfully set preferred variant, invalidating cache', 'useSetPreferredVariant', { trackId });
      // Invalidate the query for this track's variants to trigger a refetch
      queryClient.invalidateQueries({ queryKey: trackVersionsQueryKeys.list(trackId) });
    },
    onError: (error, { trackId, variantId }) => {
      logError('Mutation failed: Could not set preferred variant', error, 'useSetPreferredVariant', { trackId, variantId });
      // The error is automatically available in the component via the `error` property
    },
  });
}
