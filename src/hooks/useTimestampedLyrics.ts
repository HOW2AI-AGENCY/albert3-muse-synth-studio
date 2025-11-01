/**
 * Hook for fetching and managing timestamped lyrics
 * @version 1.0.0
 * @since 2025-11-02
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

export interface TimestampedWord {
  word: string;
  success: boolean;
  startS: number;
  endS: number;
  palign: number;
}

export interface TimestampedLyricsData {
  alignedWords: TimestampedWord[];
  waveformData: number[];
  hootCer: number;
  isStreamed: boolean;
}

interface UseTimestampedLyricsReturn {
  fetchTimestampedLyrics: () => Promise<void>;
  timestampedLyrics: TimestampedLyricsData | null;
  isLoading: boolean;
  error: Error | null;
  hasTimestampedLyrics: boolean;
}

export const useTimestampedLyrics = (
  trackId: string,
  taskId?: string,
  audioId?: string,
  musicIndex?: 0 | 1
): UseTimestampedLyricsReturn => {
  const [timestampedLyrics, setTimestampedLyrics] = useState<TimestampedLyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check if we have cached timestamped lyrics on mount
  useEffect(() => {
    const loadCachedLyrics = async () => {
      if (!trackId) return;

      try {
        const { data: track } = await supabase
          .from('tracks')
          .select('metadata')
          .eq('id', trackId)
          .single();

        if (track?.metadata?.timestamped_lyrics) {
          setTimestampedLyrics(track.metadata.timestamped_lyrics);
        }
      } catch (err) {
        logger.error('Failed to load cached timestamped lyrics', err as Error, 'useTimestampedLyrics');
      }
    };

    loadCachedLyrics();
  }, [trackId]);

  const fetchTimestampedLyrics = useCallback(async () => {
    if (!taskId) {
      const err = new Error('taskId is required to fetch timestamped lyrics');
      setError(err);
      toast.error('Cannot fetch timestamped lyrics: Missing task ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info('Fetching timestamped lyrics', 'useTimestampedLyrics', {
        trackId,
        taskId,
        audioId,
        musicIndex,
      });

      const { data, error: functionError } = await supabase.functions.invoke(
        'get-timestamped-lyrics',
        {
          body: {
            taskId,
            audioId,
            musicIndex,
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success && data?.data) {
        setTimestampedLyrics(data.data);
        toast.success(data.cached ? 'Loaded cached timestamped lyrics' : 'Timestamped lyrics fetched successfully');
      } else {
        throw new Error('Invalid response from timestamped lyrics API');
      }
    } catch (err) {
      const error = err as Error;
      logger.error('Failed to fetch timestamped lyrics', error, 'useTimestampedLyrics');
      setError(error);
      toast.error(error.message || 'Failed to fetch timestamped lyrics');
    } finally {
      setIsLoading(false);
    }
  }, [trackId, taskId, audioId, musicIndex]);

  return {
    fetchTimestampedLyrics,
    timestampedLyrics,
    isLoading,
    error,
    hasTimestampedLyrics: !!timestampedLyrics,
  };
};
