import { useQuery } from '@tanstack/react-query';
import { LyricsService } from '@/services/lyrics.service';
import { logger } from '@/utils/logger';

export interface TimestampedWord {
  word: string;
  success: boolean;
  startS: number;
  endS: number;
  palign: number;
}

interface UseTimestampedLyricsProps {
  taskId: string | undefined;
  audioId: string | undefined;
  enabled?: boolean;
}

export const useTimestampedLyrics = ({ taskId, audioId, enabled = true }: UseTimestampedLyricsProps) => {
  return useQuery({
    queryKey: ['timestampedLyrics', taskId, audioId],
    queryFn: async () => {
      if (!taskId || !audioId) {
        logger.warn('Attempted to fetch timestamped lyrics without taskId or audioId');
        return null;
      }
      try {
        return await LyricsService.getTimestampedLyrics({ taskId, audioId });
      } catch (error) {
        logger.error('Failed to fetch timestamped lyrics', error as Error, 'useTimestampedLyrics', { taskId, audioId });
        throw error; // Re-throw to let react-query handle the error state
      }
    },
    enabled: enabled && !!taskId && !!audioId,
    staleTime: 0, // Not ready immediately → allow polling until ready
    gcTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: false, // We handle readiness via polling, not retries on error
    refetchInterval: (query) => {
      const data = (query.state.data as any) || null;
      // Poll every 5s until alignedWords arrive, then stop
      return data && Array.isArray(data.alignedWords) && data.alignedWords.length > 0 ? false : 5000;
    },
  });
};
