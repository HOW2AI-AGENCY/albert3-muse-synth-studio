import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface ExtendTrackParams {
  trackId: string;
  continueAt?: number;
  prompt?: string;
  tags?: string[];
}

export const useExtendTrack = () => {
  const [isExtending, setIsExtending] = useState(false);
  const { toast } = useToast();

  const extendTrack = async (params: ExtendTrackParams) => {
    setIsExtending(true);
    try {
      logger.info(`🎵 [EXTEND] Starting track extension: ${params.trackId}`);

      const { data, error } = await supabase.functions.invoke('extend-track', {
        body: params
      });

      if (error) {
        logger.error(`❌ [EXTEND] Failed to extend track: ${error.message}`);
        throw error;
      }

      logger.info(`✅ [EXTEND] Track extension started: ${JSON.stringify(data)}`);

      toast({
        title: 'Расширение трека начато',
        description: `Создается расширенная версия трека. Это займет около минуты.`
      });

      return data;
    } catch (error) {
      logger.error(`❌ [EXTEND] Error extending track: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось расширить трек'
      });
      throw error;
    } finally {
      setIsExtending(false);
    }
  };

  return { extendTrack, isExtending };
};
