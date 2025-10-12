import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface Track {
  id: string;
  title: string;
  audio_url?: string | null;
}

/**
 * Hook для скачивания треков
 * Централизует логику скачивания и обновления счетчика
 */
export const useDownloadTrack = () => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingTrackId, setDownloadingTrackId] = useState<string | null>(null);

  const downloadTrack = useCallback(async (track: Track) => {
    if (!track.audio_url) {
      toast({
        title: "Ошибка",
        description: "Аудиофайл недоступен для скачивания",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    setDownloadingTrackId(track.id);

    try {
      // Show loading toast
      toast({
        title: "Загрузка...",
        description: "Подготовка файла к скачиванию",
      });

      // Fetch the audio file as blob
      const response = await fetch(track.audio_url);
      if (!response.ok) throw new Error('Failed to fetch audio');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Increment download count in database
      await supabase.rpc('increment_download_count', { track_id: track.id });

      toast({
        title: "✅ Скачано",
        description: `Трек "${track.title}" успешно загружен`,
      });

      logger.info('Track downloaded', `trackId: ${track.id}, title: ${track.title}`);
    } catch (error) {
      logger.error('Failed to download track', error instanceof Error ? error : new Error(`trackId: ${track.id}`));
      toast({
        title: "Ошибка",
        description: "Не удалось скачать трек. Попробуйте позже",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setDownloadingTrackId(null);
    }
  }, [toast]);

  return {
    downloadTrack,
    isDownloading,
    downloadingTrackId,
  };
};
