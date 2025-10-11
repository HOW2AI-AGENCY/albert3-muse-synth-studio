import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface AddInstrumentalParams {
  uploadUrl: string;
  title: string;
  negativeTags: string;
  tags: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  model?: 'V4_5PLUS' | 'V5';
}

export const useAddInstrumental = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const addInstrumental = async (params: AddInstrumentalParams) => {
    setIsGenerating(true);
    try {
      logger.info(`🎵 [ADD-INSTRUMENTAL] Starting instrumental generation`);

      const { data, error } = await supabase.functions.invoke('add-instrumental', {
        body: params
      });

      if (error) {
        logger.error(`❌ [ADD-INSTRUMENTAL] Failed: ${error.message}`);
        throw error;
      }

      logger.info(`✅ [ADD-INSTRUMENTAL] Task started: ${JSON.stringify(data)}`);

      toast({
        title: 'Создание инструментала начато',
        description: 'Генерируется инструментальное сопровождение. Это займет около минуты.'
      });

      return data;
    } catch (error) {
      logger.error(`❌ [ADD-INSTRUMENTAL] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать инструментал'
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return { addInstrumental, isGenerating };
};
