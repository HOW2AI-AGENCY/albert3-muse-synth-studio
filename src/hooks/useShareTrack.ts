/**
 * Hook for sharing tracks
 * Handles share dialog and clipboard copy
 */
import { useCallback } from 'react';
import { toast } from 'sonner';

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
      console.error('Share error:', error);
      if ((error as Error).name !== 'AbortError') {
        toast.error('Ошибка при попытке поделиться');
      }
    }
  }, []);

  return { shareTrack };
};
