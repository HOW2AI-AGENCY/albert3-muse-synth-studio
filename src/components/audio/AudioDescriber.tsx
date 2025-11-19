import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from '@/utils/iconImports';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface AudioDescriberProps {
  audioUrl: string;
  onDescriptionGenerated: (description: string) => void;
  disabled?: boolean;
}

export const AudioDescriber = ({ audioUrl, onDescriptionGenerated, disabled }: AudioDescriberProps) => {
  const [isDescribing, setIsDescribing] = useState(false);
  const { toast } = useToast();

  const handleDescribe = async () => {
    setIsDescribing(true);
    logger.info('[AudioDescriber] Generating description for audio:', audioUrl.substring(0, 50));

    try {
      const { data, error } = await SupabaseFunctions.invoke('analyze-audio', {
        body: { audioUrl, fullDescription: true }
      });

      if (error) throw error;

      if (data?.fullDescription) {
        onDescriptionGenerated(data.fullDescription);
        toast({
          title: '✨ Описание готово',
          description: 'Текстовое описание музыки добавлено в промпт',
        });
        logger.info('[AudioDescriber] Description generated', '[AudioDescriber]', {
          descriptionLength: data.fullDescription.length,
          audioUrlPreview: audioUrl.substring(0, 50),
          hasGenre: !!data.genre,
          hasBpm: !!data.bpm,
          hasKey: !!data.key
        });
      } else {
        throw new Error('No description returned');
      }
    } catch (error) {
      logger.error('[AudioDescriber] Failed to generate description:', error instanceof Error ? error : undefined);
      toast({
        title: 'Ошибка описания',
        description: 'Не удалось сгенерировать описание музыки',
        variant: 'destructive',
      });
    } finally {
      setIsDescribing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDescribe}
      disabled={isDescribing || disabled}
      className="h-7 text-xs gap-1.5"
    >
      {isDescribing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {isDescribing ? 'Описываем...' : 'Описать музыку'}
    </Button>
  );
};
