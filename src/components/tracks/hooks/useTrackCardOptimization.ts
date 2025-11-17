/**
 * useTrackCardOptimization Hook
 * 
 * Performance optimization for TrackCard rendering
 * Combines intersection observer + image preloading + analytics
 * 
 * @version 1.0.0
 * @created 2025-11-17
 */

import { useEffect } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { logger } from '@/utils/logger';

interface UseTrackCardOptimizationOptions {
  trackId: string;
  coverUrl?: string | null;
  /**
   * Track analytics impressions
   */
  trackImpression?: boolean;
  /**
   * Callback when card becomes visible
   */
  onVisible?: (trackId: string) => void;
}

/**
 * Optimization hook for TrackCard
 * 
 * Features:
 * - Intersection observer for visibility detection
 * - Analytics impression tracking
 * - Performance logging
 * 
 * @example
 * ```tsx
 * const TrackCard = ({ track }) => {
 *   const { ref, isVisible, shouldLoadImage } = useTrackCardOptimization({
 *     trackId: track.id,
 *     coverUrl: track.cover_url,
 *     trackImpression: true,
 *     onVisible: (id) => console.log('Card visible:', id)
 *   });
 * 
 *   return (
 *     <div ref={ref}>
 *       {shouldLoadImage && <img src={track.cover_url} />}
 *     </div>
 *   );
 * };
 * ```
 */
export const useTrackCardOptimization = ({
  trackId,
  coverUrl,
  trackImpression = false,
  onVisible,
}: UseTrackCardOptimizationOptions) => {
  const { ref, isVisible, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px', // Load 200px before entering viewport
    freezeOnceVisible: true,
  });

  // Track impression (one-time)
  useEffect(() => {
    if (isVisible && trackImpression) {
      logger.debug('Track card impression', 'useTrackCardOptimization', {
        trackId,
        hasCover: !!coverUrl,
      });

      // Trigger analytics callback
      onVisible?.(trackId);
    }
  }, [isVisible, trackImpression, trackId, coverUrl, onVisible]);

  // Should load image - visible or within loading margin
  const shouldLoadImage = isIntersecting || isVisible;

  return {
    ref,
    isVisible,
    isIntersecting,
    shouldLoadImage,
  };
};
