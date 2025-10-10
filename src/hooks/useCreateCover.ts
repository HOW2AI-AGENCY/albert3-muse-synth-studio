import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface CreateCoverParams {
  prompt: string;
  tags?: string[];
  title?: string;
  referenceAudioUrl?: string;
  referenceTrackId?: string;
  make_instrumental?: boolean;
  model?: "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5";
}

export const useCreateCover = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createCover = async (params: CreateCoverParams) => {
    setIsCreating(true);
    try {
      logger.info(`🎤 [COVER] Starting cover creation: ${params.prompt}`);

      const { data, error } = await supabase.functions.invoke('create-cover', {
        body: params
      });

      if (error) {
        logger.error(`❌ [COVER] Failed to create cover: ${error.message}`);
        throw error;
      }

      logger.info(`✅ [COVER] Cover creation started: ${JSON.stringify(data)}`);

      toast({
        title: 'Создание кавера начато',
        description: `Создается кавер трека. Это займет около 2 минут.`
      });

      return data;
    } catch (error) {
      logger.error(`❌ [COVER] Error creating cover: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать кавер'
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return { createCover, isCreating };
};
