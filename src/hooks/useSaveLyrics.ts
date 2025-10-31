import { useState } from 'react';
import { saveLyrics, SaveLyricsOptions, SaveLyricsResult } from '@/services/lyrics/lyricsService';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface UseSaveLyricsReturn {
  saveLyricsAsync: (lyrics: string, options?: SaveLyricsOptions) => Promise<SaveLyricsResult | null>;
  isSaving: boolean;
  error: Error | null;
}

export function useSaveLyrics(): UseSaveLyricsReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveLyricsAsync = async (
    lyrics: string,
    options?: SaveLyricsOptions
  ): Promise<SaveLyricsResult | null> => {
    if (!lyrics.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите текст лирики',
        variant: 'destructive'
      });
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await saveLyrics(lyrics, options);
      
      toast({
        title: 'Готово!',
        description: result.message,
      });

      logger.info('Lyrics saved successfully via hook');
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Неизвестная ошибка');
      setError(error);
      
      toast({
        title: 'Ошибка сохранения',
        description: error.message,
        variant: 'destructive'
      });

      logger.error('Error saving lyrics via hook', error);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveLyricsAsync,
    isSaving,
    error
  };
}
