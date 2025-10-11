import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface AddVocalParams {
  trackId: string;
  vocalText?: string;
  vocalStyle?: string;
}

export const useAddVocal = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const addVocal = async (params: AddVocalParams) => {
    setIsGenerating(true);
    try {
      logger.info(`🎤 [ADD-VOCAL] Starting vocal generation for track: ${params.trackId}`);

      // Получаем данные трека
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('audio_url, title, style_tags')
        .eq('id', params.trackId)
        .single();

      if (trackError || !track?.audio_url) {
        throw new Error('Трек не найден или не имеет аудио');
      }

      // Генерируем вокал через generate-suno с параметром make_instrumental = false
      const { data, error } = await supabase.functions.invoke('generate-suno', {
        body: {
          prompt: params.vocalText || `Vocal for ${track.title}`,
          tags: params.vocalStyle || track.style_tags?.join(', ') || 'vocal',
          make_instrumental: false,
          reference_audio_url: track.audio_url,
          model: 'V4_5PLUS'
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
