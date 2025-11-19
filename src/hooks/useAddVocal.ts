import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface AddVocalParams extends Record<string, unknown> {
  uploadUrl: string;
  prompt: string;
  title: string;
  negativeTags: string;
  style: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  model?: 'V4_5PLUS' | 'V5';
  trackId?: string;
}

export const useAddVocal = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const addVocal = async (params: AddVocalParams) => {
    setIsGenerating(true);
    try {
      logger.info(`🎤 [ADD-VOCAL] Starting vocal generation`, 'useAddVocal', params);

      // Call new add-vocals endpoint
      const { data, error } = await SupabaseFunctions.invoke('add-vocals', {
        body: {
          uploadUrl: params.uploadUrl,
          prompt: params.prompt,
          title: params.title,
          negativeTags: params.negativeTags,
          style: params.style,
          vocalGender: params.vocalGender,
          styleWeight: params.styleWeight,
          weirdnessConstraint: params.weirdnessConstraint,
          audioWeight: params.audioWeight,
          model: params.model || 'V4_5PLUS',
          trackId: params.trackId
        }
      });

      if (error) {
        logger.error(`❌ [ADD-VOCAL] Failed: ${error.message}`);
        throw error;
      }

      logger.info(`✅ [ADD-VOCAL] Task started: ${JSON.stringify(data)}`);

      toast({
        title: 'Добавление вокала начато',
        description: 'Генерируется вокальная дорожка. Это займет около минуты.'
      });

      return data;
    } catch (error) {
      logger.error(`❌ [ADD-VOCAL] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить вокал'
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return { addVocal, isGenerating };
};
