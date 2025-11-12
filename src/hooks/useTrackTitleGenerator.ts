/**
 * Hook for AI-powered track title generation
 * Analyzes prompt, style, and lyrics to suggest creative titles
 * 
 * @version 1.0.0
 * @created 2025-11-12
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

interface GenerateTitleParams {
  prompt?: string;
  lyrics?: string;
  styleTags?: string[];
  genre?: string;
  mood?: string;
}

interface GeneratedTitle {
  title: string;
  suggestions: string[];
}

export const useTrackTitleGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);

  const generateTitle = useCallback(async (params: GenerateTitleParams): Promise<GeneratedTitle | null> => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-track-title', {
        body: params,
      });

      if (error) {
        logger.error('Failed to generate title', error, 'useTrackTitleGenerator');
        toast.error('Не удалось сгенерировать название');
        return null;
      }

      if (!data.success || !data.title) {
        logger.error('Invalid response from title generator', new Error('No title in response'));
        toast.error('Не удалось сгенерировать название');
        return null;
      }

      setGeneratedTitle(data.title);
      
      logger.info('Title generated successfully', 'useTrackTitleGenerator', {
        title: data.title,
      });

      return {
        title: data.title,
        suggestions: data.suggestions || [data.title],
      };
    } catch (error) {
      logger.error('Error generating title', error as Error, 'useTrackTitleGenerator');
      toast.error('Ошибка генерации названия');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const acceptTitle = useCallback((title: string) => {
    setGeneratedTitle(title);
    toast.success(`Название установлено: "${title}"`);
  }, []);

  const rejectTitle = useCallback(() => {
    setGeneratedTitle(null);
    toast.info('Название отклонено');
  }, []);

  return {
    generateTitle,
    acceptTitle,
    rejectTitle,
    isGenerating,
    generatedTitle,
  };
};
