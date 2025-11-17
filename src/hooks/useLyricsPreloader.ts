import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LyricsService } from '@/services/lyrics.service';
import { logger } from '@/utils/logger';

interface UseLyricsPreloaderOptions {
  taskId?: string;
  audioId?: string;
  enabled?: boolean;
  prefetchDelay?: number; // Delay in ms before prefetching
}

/**
 * Preloads timestamped lyrics data in the background
 * Improves perceived performance by fetching data before user navigates
 * 
 * @example
 * ```tsx
 * // Preload lyrics when track card is hovered
 * useLyricsPreloader({
 *   taskId: track.suno_task_id,
 *   audioId: track.suno_id,
 *   enabled: isHovered,
 *   prefetchDelay: 500
 * });
 * ```
 */
export const useLyricsPreloader = ({
  taskId,
  audioId,
  enabled = true,
  prefetchDelay = 300,
}: UseLyricsPreloaderOptions) => {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled || !taskId || !audioId) {
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Delay prefetch to avoid unnecessary requests on quick hovers
    timeoutRef.current = setTimeout(async () => {
      const queryKey = ['timestampedLyrics', taskId, audioId];

      // Check if data is already cached
      const existingData = queryClient.getQueryData(queryKey);
      if (existingData) {
        logger.debug('Lyrics already cached, skipping prefetch', 'useLyricsPreloader', {
          taskId,
          audioId,
        });
        return;
      }

      logger.info('Prefetching timestamped lyrics', 'useLyricsPreloader', {
        taskId,
        audioId,
      });

      // Prefetch in background
      try {
        await queryClient.prefetchQuery({
          queryKey,
          queryFn: async () => {
            try {
              return await LyricsService.getTimestampedLyrics({ taskId, audioId });
            } catch (error) {
              logger.warn('Lyrics prefetch failed (not ready yet)', 'useLyricsPreloader', {
                taskId,
                audioId,
                error: (error as Error)?.message,
              });
              return null;
            }
          },
          staleTime: 1000 * 60 * 60, // 1 hour
        });
      } catch (error) {
        // Silent fail - prefetch is optional optimization
        logger.debug('Prefetch error (expected if not ready)', 'useLyricsPreloader', {
          error: (error as Error)?.message,
        });
      }
    }, prefetchDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, taskId, audioId, prefetchDelay, queryClient]);
};
