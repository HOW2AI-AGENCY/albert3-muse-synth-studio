import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface UploadExtendAudioParams {
  uploadUrl: string;
  defaultParamFlag: boolean;
  instrumental?: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
}

export const useUploadExtendAudio = () => {
  const [isExtending, setIsExtending] = useState(false);
  const { toast } = useToast();

  const uploadExtendAudio = async (params: UploadExtendAudioParams) => {
    setIsExtending(true);
    try {
      logger.info(`🎵 [UPLOAD-EXTEND] Starting upload and extend audio`);

      const { data, error } = await SupabaseFunctions.invoke('upload-extend-audio', {
        body: params
      });

      if (error) {
        logger.error(`❌ [UPLOAD-EXTEND] Failed: ${error.message}`);
        throw error;
      }

      logger.info(`✅ [UPLOAD-EXTEND] Task started: ${JSON.stringify(data)}`);

      toast({
        title: 'Расширение аудио начато',
        description: 'Создается расширенная версия вашего аудио. Это займет около минуты.'
      });

      return data;
    } catch (error) {
      logger.error(`❌ [UPLOAD-EXTEND] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось расширить аудио'
      });
      throw error;
    } finally {
      setIsExtending(false);
    }
  };

  return { uploadExtendAudio, isExtending };
};
