import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface AddInstrumentalParams {
  uploadUrl: string;
  title: string;
  negativeTags?: string;
  tags?: string;
  prompt?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  model?: 'V4_5PLUS' | 'V5' | 'chirp-v4';
  provider?: 'suno' | 'mureka';
}

export const useAddInstrumental = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const addInstrumental = async (params: AddInstrumentalParams) => {
    setIsGenerating(true);
    try {
      const provider = params.provider || 'suno';
      const functionName = provider === 'mureka' ? 'add-instrumental-mureka' : 'add-instrumental';
      
      logger.info(`🎵 [ADD-INSTRUMENTAL] Starting instrumental generation for ${provider}`);

      // Prepare payload based on provider
      let payload: any;
      
      if (provider === 'mureka') {
        payload = {
          uploadUrl: params.uploadUrl,
          title: params.title,
          prompt: params.prompt || `Add instrumental to: ${params.title}`,
          model: params.model || 'chirp-v4',
        };
      } else {
        // Suno payload
        payload = {
          uploadUrl: params.uploadUrl,
          title: params.title,
          negativeTags: params.negativeTags,
          tags: params.tags,
          vocalGender: params.vocalGender,
          styleWeight: params.styleWeight,
          weirdnessConstraint: params.weirdnessConstraint,
          audioWeight: params.audioWeight,
          model: params.model || 'V4_5PLUS',
        };
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (error) {
        logger.error(`❌ [ADD-INSTRUMENTAL] Failed for ${provider}: ${error.message}`);
        throw error;
      }

      logger.info(`✅ [ADD-INSTRUMENTAL] Task started for ${provider}`);

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
