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
      if (!taskId && !audioId) {
        logger.warn('Attempted to fetch timestamped lyrics without taskId and audioId');
        return null;
      }
      try {
        return await LyricsService.getTimestampedLyrics({ taskId: taskId || '', audioId: audioId || '' });
      } catch (error) {
        // Treat any transient backend error (including 404 LYRICS_NOT_READY) as "not ready yet"
        logger.warn('Timestamped lyrics not ready yet or transient error', 'useTimestampedLyrics', { taskId, audioId, error: (error as Error)?.message });
        return null; // Avoid throwing to prevent error boundaries/blank screens
      }
    },
    enabled: enabled && (!!taskId || !!audioId),
    staleTime: 0, // Not ready immediately → allow polling until ready
    gcTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: false, // We handle readiness via polling, not retries on error
    // ✅ P0 FIX: Disable refetch on window focus/reconnect to prevent "aborted signal" errors
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      const data = (query.state.data as any) || null;
      // Poll every 5s until alignedWords arrive, then stop
      return data && Array.isArray(data.alignedWords) && data.alignedWords.length > 0 ? false : 5000;
    },
  });
};
