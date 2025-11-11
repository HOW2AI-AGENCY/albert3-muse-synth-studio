import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

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

      return response.data;
    } catch (error) {
      logger.error('Error fetching timestamped lyrics', error as Error, 'LyricsService', { taskId, audioId });
      throw error;
    }
  },
};
