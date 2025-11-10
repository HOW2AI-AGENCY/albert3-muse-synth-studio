/**
 * ✅ REFACTORED: useTrackLike now uses VERSION-BASED likes (track_version_likes)
 *
 * This hook provides backward compatibility for components that work with trackId.
 * Internally, it loads track versions and applies likes to the master version.
 *
 * Migration path: Old track_likes → New track_version_likes
 */

import { useTrackVariants } from './useTrackVariants';
import { useTrackVersionLike } from './useTrackVersionLike';

/**
 * @deprecated Use useTrackVersionLike directly if you have version ID
 * This hook is kept for backward compatibility with components that only have trackId
 */
export const useTrackLike = (trackId: string, initialLikeCount: number = 0) => {
  // Load track versions to get the master version
  const { data: variantsData, isLoading: versionsLoading } = useTrackVariants(trackId, true);

  // Use the master version (or main version as fallback) for likes
  const versionToLike = variantsData?.preferredVariant || variantsData?.mainTrack;
  const versionId = versionToLike?.id || trackId;

  // Delegate to version-based like system
  const { isLiked, likeCount, toggleLike, isLoading: likeLoading } = useTrackVersionLike(
    versionId,
    initialLikeCount
  );

  return {
    isLiked,
    likeCount,
    toggleLike,
    isLoading: versionsLoading || likeLoading,
  };
};
