import { useEffect, useRef } from 'react';
import { AnalyticsService } from '@/services/analytics.service';
import { logError, logInfo } from '@/utils/logger';

const PLAY_THRESHOLD_SECONDS = 30; // Track counts as played after 30 seconds
const STORAGE_KEY_PREFIX = 'track_play_';

/**
 * Hook to track play analytics for the audio player
 * Records a play event after the user has listened for PLAY_THRESHOLD_SECONDS
 */
export const usePlayAnalytics = (
  trackId: string | null,
  isPlaying: boolean,
  currentTime: number
) => {
  const playTimeRef = useRef(0);
  const hasRecordedRef = useRef(false);
  const lastTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset when track changes
    if (trackId !== lastTrackIdRef.current) {
      playTimeRef.current = 0;
      hasRecordedRef.current = false;
      lastTrackIdRef.current = trackId;

      // Check if we've already recorded this play in this session
      if (trackId) {
        const storageKey = `${STORAGE_KEY_PREFIX}${trackId}`;
        const lastPlay = localStorage.getItem(storageKey);
        
        if (lastPlay) {
          const lastPlayTime = parseInt(lastPlay, 10);
          const hourAgo = Date.now() - 60 * 60 * 1000;
          
          // Don't record again if played within the last hour
          if (lastPlayTime > hourAgo) {
            hasRecordedRef.current = true;
          }
        }
      }
    }
  }, [trackId]);

  useEffect(() => {
    if (!trackId || !isPlaying || hasRecordedRef.current) {
      return;
    }

    // Track play time
    const interval = setInterval(() => {
      playTimeRef.current += 1;

      // Record play after threshold
      if (playTimeRef.current >= PLAY_THRESHOLD_SECONDS && !hasRecordedRef.current) {
        hasRecordedRef.current = true;
        
        // Record the play
        AnalyticsService.recordPlay(trackId).catch(error => {
          console.error('Failed to record play:', error);
        });

        // Store timestamp to prevent duplicate counts
        const storageKey = `${STORAGE_KEY_PREFIX}${trackId}`;
        localStorage.setItem(storageKey, Date.now().toString());

        console.log(`Play recorded for track ${trackId}`);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [trackId, isPlaying]);

  // Clean up old play records (older than 7 days)
  useEffect(() => {
    const cleanupOldRecords = () => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          const timestamp = localStorage.getItem(key);
          if (timestamp && parseInt(timestamp, 10) < weekAgo) {
            localStorage.removeItem(key);
          }
        }
      }
    };

    cleanupOldRecords();
  }, []);

  return {
    playTime: playTimeRef.current,
    hasRecorded: hasRecordedRef.current,
  };
};
