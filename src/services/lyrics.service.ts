import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { lyricsCache } from './lyrics/lyricsCache';

interface GetTimestampedLyricsPayload {
  taskId: string;
  audioId: string;
}

interface AlignedWord {
  word: string;
  success: boolean;
  startS: number;
  endS: number;
  palign: number;
}

interface TimestampedLyricsResponse {
  alignedWords: AlignedWord[];
  waveformData: number[];
  hootCer: number;
  isStreamed: boolean;
}

interface SunoLyricsApiResponse {
  success: boolean;
  data: TimestampedLyricsResponse;
  cached: boolean;
  error?: string;
}

export const LyricsService = {
  async getTimestampedLyrics({ taskId, audioId }: GetTimestampedLyricsPayload): Promise<TimestampedLyricsResponse | null> {
    try {
      // ✅ Check cache first
      const cached = await lyricsCache.get(taskId, audioId);
      if (cached) {
        logger.info('Using cached lyrics', 'LyricsService', { taskId, audioId });
        return cached;
      }

      // ✅ Fetch from API
      const { data, error } = await supabase.functions.invoke('get-timestamped-lyrics', {
        method: 'POST',
        body: { taskId, audioId },
      });

      if (error) {
        logger.error('Failed to invoke get-timestamped-lyrics Edge Function', error);
        throw new Error(error.message);
      }

      const response = data as SunoLyricsApiResponse;

      if (!response.success) {
        logger.error('Suno lyrics Edge Function returned error', new Error(response.error || 'Unknown error'), 'LyricsService', { taskId, audioId });
        throw new Error(response.error || 'Failed to get timestamped lyrics');
      }

      // ✅ Cache the result
      if (response.data) {
        await lyricsCache.set(taskId, audioId, response.data);
      }

      return response.data;
    } catch (error) {
      logger.error('Error fetching timestamped lyrics', error as Error, 'LyricsService', { taskId, audioId });
      throw error;
    }
  },

  /**
   * Prefetch lyrics for upcoming tracks in queue
   */
  async prefetchLyrics(tracks: Array<{ taskId?: string; audioId: string }>): Promise<void> {
    const prefetchPromises = tracks
      .filter(t => t.taskId && t.audioId)
      .slice(0, 3) // Prefetch next 3 tracks
      .map(async (track) => {
        try {
          await this.getTimestampedLyrics({
            taskId: track.taskId!,
            audioId: track.audioId,
          });
        } catch (error) {
          logger.warn('Prefetch failed', 'LyricsService', { 
            taskId: track.taskId, 
            audioId: track.audioId 
          });
        }
      });

    await Promise.allSettled(prefetchPromises);
  },

  /**
   * Clear lyrics cache
   */
  async clearCache(): Promise<void> {
    await lyricsCache.clear();
  },
};
