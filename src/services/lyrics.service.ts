import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { lyricsCache } from './lyrics/lyricsCache';
import { retryWithBackoff, RETRY_CONFIGS } from '@/utils/retryWithBackoff';

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


export const LyricsService = {
  /**
   * Fetch timestamped lyrics with retry and fallback mechanism
   * @param taskId - Suno task ID
   * @param audioId - Audio track ID
   * @returns Timestamped lyrics or null if unavailable
   *
   * Features:
   * - ✅ Cache-first strategy
   * - ✅ Automatic retry with exponential backoff (3 attempts)
   * - ✅ Graceful fallback to null on persistent failures
   * - ✅ Detailed logging for debugging
   */
  async getTimestampedLyrics({ taskId, audioId }: GetTimestampedLyricsPayload): Promise<TimestampedLyricsResponse | null> {
    try {
      // ✅ Validate inputs
      if (!taskId || !audioId || taskId === 'null' || taskId === 'undefined') {
        logger.warn('Invalid taskId or audioId', 'LyricsService', { taskId, audioId });
        return null;
      }

      // ✅ Check cache first (fast path)
      const cached = await lyricsCache.get(taskId, audioId);
      if (cached) {
        logger.info('Using cached lyrics', 'LyricsService', { taskId, audioId });
        return cached;
      }

      // ✅ Fetch from API with retry mechanism
      // Uses standard retry config: 3 attempts, 500ms initial delay, exponential backoff
      const normalized = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.functions.invoke('get-timestamped-lyrics', {
            method: 'POST',
            body: { taskId, audioId },
          });

          if (error) {
            logger.error('Failed to invoke get-timestamped-lyrics Edge Function', error, 'LyricsService', { taskId, audioId });
            
            // ✅ Check if this is a FunctionsHttpError (non-2xx status)
            // For 404, the error is in data, not in error object
            // So we'll check data below. Just return null here to let data check happen
            return null;
          }

          // ✅ Check if data indicates lyrics not ready (404 response)
          if (data && typeof data === 'object' && 'error' in data) {
            const errorData = data as { error?: string; success?: boolean; message?: string };
            if (errorData.error === 'LYRICS_NOT_READY' || errorData.success === false) {
              logger.info('Timestamped lyrics not ready yet', 'LyricsService', { 
                taskId, 
                audioId, 
                message: errorData.message 
              });
              return null;
            }
          }

          // ✅ If we got here with null/undefined data after an error, return null
          if (!data) {
            logger.warn('No data received from Edge Function', 'LyricsService', { taskId, audioId });
            return null;
          }

          // ✅ Edge Function v2.2.0+ guarantees normalized response format
          // No need for multiple format checks - the Edge Function handles all normalization
          const result = data as TimestampedLyricsResponse;

          // ✅ Validate that we have the required fields (safety check)
          if (!result || !result.alignedWords || !Array.isArray(result.alignedWords)) {
            logger.error(
              'Edge Function returned invalid data structure',
              new Error('Missing alignedWords array'),
              'LyricsService',
              { taskId, audioId, hasData: !!result, dataKeys: result ? Object.keys(result) : [] }
            );
            throw new Error('Invalid lyrics data received from server');
          }

          return result;
        },
        {
          ...RETRY_CONFIGS.standard, // 3 attempts, 500ms initial, 2x backoff
          onRetry: (error, attempt, delayMs) => {
            logger.warn(
              `Retrying lyrics fetch (attempt ${attempt})`,
              'LyricsService',
              { taskId, audioId, error: error.message, nextRetryIn: delayMs }
            );
          },
        }
      );

      // ✅ If lyrics not ready, return null gracefully
      if (!normalized) {
        return null;
      }

      logger.info('Successfully fetched timestamped lyrics', 'LyricsService', {
        taskId,
        audioId,
        wordCount: normalized.alignedWords.length,
        hasWaveform: normalized.waveformData && normalized.waveformData.length > 0,
      });

      // ✅ Cache the result for future requests
      await lyricsCache.set(taskId, audioId, normalized);
      return normalized;
    } catch (error) {
      // ✅ FALLBACK: Return null instead of throwing
      // This allows the UI to gracefully handle missing lyrics
      logger.error(
        'Failed to fetch timestamped lyrics after all retries - falling back to null',
        error as Error,
        'LyricsService',
        { taskId, audioId }
      );

      // Return null instead of throwing - lyrics are not critical for playback
      return null;
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
