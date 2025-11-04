import { useQuery } from '@tanstack/react-query';
import { LyricsService } from '@/services/lyrics.service';
import { logger } from '@/utils/logger';

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
    staleTime: Infinity, // Lyrics data is unlikely to change
    gcTime: 1000 * 60 * 60, // Cache for 1 hour (gcTime is the correct option)
  });
};
