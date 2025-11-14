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
      // Validate inputs
      if (!taskId || !audioId || taskId === 'null' || taskId === 'undefined') {
        logger.warn('Invalid taskId or audioId', 'LyricsService', { taskId, audioId });
        return null;
      }

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

      const response = data as any;

      // Normalize various possible response shapes
      let normalized: TimestampedLyricsResponse | null = null;
      if (response?.success && response?.data?.alignedWords) {
        normalized = response.data as TimestampedLyricsResponse;
      } else if (response?.alignedWords) {
        normalized = response as TimestampedLyricsResponse;
      } else if (response?.code === 200 && response?.data?.alignedWords) {
        normalized = response.data as TimestampedLyricsResponse;
      }

      if (!normalized) {
        logger.error('Suno lyrics Edge Function returned unexpected shape', new Error('Invalid response'), 'LyricsService', { taskId, audioId, preview: JSON.stringify(response)?.slice(0, 200) });
        throw new Error(response?.error || 'Failed to get timestamped lyrics');
      }

      // ✅ Cache the result
      await lyricsCache.set(taskId, audioId, normalized);
      return normalized;
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
