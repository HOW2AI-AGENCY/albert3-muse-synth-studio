/**
 * useImagePreloader Hook
 * 
 * Intelligent image preloading strategy for cover art
 * Preloads next N images in viewport direction
 * 
 * @version 1.0.0
 * @created 2025-11-17
 */

import { useEffect, useRef, useState } from 'react';
import { logger } from '@/utils/logger';

interface UseImagePreloaderOptions {
  /**
   * Maximum number of images to preload at once
   * @default 3
   */
  maxPreload?: number;
  
  /**
   * Image URLs to preload
   */
  imageUrls: string[];
  
  /**
   * Priority mode: 'high' for critical images
   * @default 'low'
   */
  priority?: 'high' | 'low';
}

interface PreloadStatus {
  url: string;
  loaded: boolean;
  error: boolean;
}

/**
 * Preload images for better UX
 * 
 * @example
 * ```tsx
 * const TrackList = ({ tracks }) => {
 *   const coverUrls = tracks.map(t => t.cover_url).filter(Boolean);
 *   
 *   const { preloadedImages, preloadProgress } = useImagePreloader({
 *     imageUrls: coverUrls,
 *     maxPreload: 5,
 *     priority: 'high'
 *   });
 * 
 *   return (
 *     <div>
 *       <p>Loaded: {preloadProgress.loaded}/{preloadProgress.total}</p>
 *       {tracks.map(track => (
 *         <TrackCard key={track.id} track={track} />
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 */
export const useImagePreloader = ({
  imageUrls,
  maxPreload = 3,
  priority = 'low',
}: UseImagePreloaderOptions) => {
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel previous preloading
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const preloadBatch = async () => {
      // Take first N unloaded images
      const toPreload = imageUrls
        .filter(url => url && !preloadedImages.has(url) && !failedImages.has(url))
        .slice(0, maxPreload);

      if (toPreload.length === 0) return;

      setLoadingImages(new Set(toPreload));

      logger.info(`Preloading ${toPreload.length} images`, 'useImagePreloader', {
        priority,
        total: imageUrls.length,
      });

      const promises = toPreload.map(url => 
        new Promise<PreloadStatus>((resolve) => {
          const img = new Image();
          
          // Set priority hint
          if ('fetchPriority' in img) {
            (img as any).fetchPriority = priority;
          }

          img.onload = () => {
            imageCache.current.set(url, img);
            resolve({ url, loaded: true, error: false });
          };

          img.onerror = () => {
            resolve({ url, loaded: false, error: true });
          };

          // Start loading
          img.src = url;
        })
      );

      const results = await Promise.allSettled(promises);

      // Update state based on results
      const newPreloaded = new Set(preloadedImages);
      const newFailed = new Set(failedImages);

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { url, loaded, error } = result.value;
          if (loaded) {
            newPreloaded.add(url);
          }
          if (error) {
            newFailed.add(url);
          }
        }
      });

      setPreloadedImages(newPreloaded);
      setFailedImages(newFailed);
      setLoadingImages(new Set());

      logger.info('Preloading batch complete', 'useImagePreloader', {
        loaded: newPreloaded.size,
        failed: newFailed.size,
        total: imageUrls.length,
      });
    };

    preloadBatch();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [imageUrls, maxPreload, priority, preloadedImages, failedImages]);

  const preloadProgress = {
    total: imageUrls.length,
    loaded: preloadedImages.size,
    failed: failedImages.size,
    loading: loadingImages.size,
    percentage: imageUrls.length > 0 
      ? Math.round((preloadedImages.size / imageUrls.length) * 100)
      : 0,
  };

  const isImagePreloaded = (url: string) => preloadedImages.has(url);
  const isImageFailed = (url: string) => failedImages.has(url);
  const isImageLoading = (url: string) => loadingImages.has(url);

  return {
    preloadedImages,
    failedImages,
    loadingImages,
    preloadProgress,
    isImagePreloaded,
    isImageFailed,
    isImageLoading,
  };
};
