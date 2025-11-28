import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getTrackWithVariants, type TrackWithVariants } from './trackVersions';
import { trackVersionsQueryKeys } from './trackVersions';

/**
 * Custom hook to fetch a track and its variants.
 * @param trackId The ID of the parent track.
 * @param options Optional options for the query.
 * @returns The result of the query.
 */
export const useTrackVersions = (
  trackId: string | null | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<TrackWithVariants | null, Error> => {
  return useQuery<TrackWithVariants | null, Error>({
    queryKey: trackVersionsQueryKeys.list(trackId!),
    queryFn: () => getTrackWithVariants(trackId!),
    enabled: !!trackId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
