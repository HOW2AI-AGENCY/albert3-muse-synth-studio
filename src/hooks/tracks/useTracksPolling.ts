/**
 * Polling fallback for processing/pending tracks
 * Ensures stuck tracks eventually update
 */

import { useState, useEffect } from 'react';
import { useInterval } from '../common/useInterval';
import type { Track } from '@/types/domain/track.types';

/**
 * Poll for updates when tracks are processing
 */
export const useTracksPolling = (
  tracks: Track[],
  onRefresh: () => void,
  interval: number = 5000
) => {
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    const processingTracks = tracks.filter(
      t => t.status === 'processing' || t.status === 'pending'
    );

    setIsPolling(processingTracks.length > 0);
  }, [tracks]);

  useInterval(
    () => {
      if (isPolling) {
        onRefresh();
      }
    },
    isPolling ? interval : null
  );

  return { isPolling, processingCount: tracks.filter(t => t.status === 'processing').length };
};
