/**
 * Hook for AI-powered prompt improvement
 * Extracted from useMusicGenerationStore for better separation of concerns
 */

import { useState, useCallback } from 'react';
import { ApiService } from '@/services/api.service';
import { logger } from '@/utils/logger';

type ToastFunction = (options: { 
  title: string; 
  description: string; 
  variant?: 'destructive' | 'default' | null 
}) => void;

interface UseImprovePromptOptions {
  toast: ToastFunction;
}

export const useImprovePrompt = ({ toast }: UseImprovePromptOptions) => {
  const [isImproving, setIsImproving] = useState(false);

  const improve = useCallback(async (rawPrompt: string | undefined): Promise<string | null> => {
    const promptToImprove = typeof rawPrompt === 'string' ? rawPrompt.trim() : '';
    
    if (!promptToImprove) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, введите описание музыки для улучшения.',
        variant: 'destructive',
      });
      return null;
    }

    if (isImproving) {
      return null;
    }

    setIsImproving(true);
    
    try {
      const response = await ApiService.improvePrompt({ prompt: promptToImprove });
      
      toast({
        title: '✨ Промпт улучшен!',
        description: 'Ваше описание было оптимизировано с помощью AI.',
      });
      
      return response.improvedPrompt;
    } catch (error) {
      logger.error('Ошибка при улучшении промпта', error as Error);
      
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось улучшить промпт.',
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setIsImproving(false);
    }
  }, [isImproving, toast]);

  return {
    improve,
    isImproving,
  };
};
