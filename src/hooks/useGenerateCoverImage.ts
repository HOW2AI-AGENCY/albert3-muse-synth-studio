import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useGenerateCoverImage = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateCoverImage = async (trackId: string) => {
    setIsGenerating(true);
    try {
      logger.info(`🎨 [COVER-IMAGE] Generating cover for track: ${trackId}`);

      const { data, error } = await SupabaseFunctions.invoke('generate-cover-image', {
        body: { trackId }
      });

      if (error) {
        logger.error(`❌ [COVER-IMAGE] Failed: ${error.message}`);
        throw error;
      }

      logger.info(`✅ [COVER-IMAGE] Generation started: ${JSON.stringify(data)}`);

      toast({
        title: 'Генерация обложки начата',
        description: 'AI создаёт персонализированные обложки для вашего трека. Это займёт около минуты.'
      });

      return data;
    } catch (error) {
      logger.error(`❌ [COVER-IMAGE] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать обложку'
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateCoverImage, isGenerating };
};
