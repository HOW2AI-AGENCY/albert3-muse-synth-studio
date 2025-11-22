/**
 * Hook for sharing tracks
 * Handles share dialog and clipboard copy
 */
import { useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useShareTrack = () => {
  const shareTrack = useCallback(async (trackId: string) => {
    const url = `${window.location.origin}/track/${trackId}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Поделиться треком',
          url
        });
        toast.success('Трек успешно отправлен');
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Ссылка скопирована в буфер обмена');
      }
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        logger.warn('Share aborted by user', 'useShareTrack', { trackId });
      } else {
        logger.error('Share error', err, 'useShareTrack');
        toast.error('Ошибка при попытке поделиться');
      }
    }
  }, []);

  return { shareTrack };
};
