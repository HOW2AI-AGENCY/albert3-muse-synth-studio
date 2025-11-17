/**
 * Hook for AI-assisted project creation
 * Uses Lovable AI to generate project concepts and tracklists
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface PlannedTrack {
  order: number;
  title: string;
  style_prompt: string; // ✅ НОВОЕ: Промпт стиля для генерации
  duration_target: number;
  notes?: string;
}

export interface AIProjectSuggestions {
  name: string;
  genre: string;
  mood: string;
  style_tags: string[];
  concept_description: string;
  story_theme: string;
  tempo_range: { min: number; max: number };
  planned_tracks: PlannedTrack[];
}

export const useAIProjectCreation = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<AIProjectSuggestions | null>(null);

  const generateConcept = useCallback(async (prompt: string): Promise<AIProjectSuggestions | null> => {
    setIsGenerating(true);
    
    try {
      logger.info('Generating project concept with AI', 'useAIProjectCreation', { prompt });

      const { data, error } = await supabase.functions.invoke('generate-project-concept', {
        body: { prompt }
      });

      if (error) {
        logger.error('Supabase function error', error, 'useAIProjectCreation');
        throw new Error(error.message || 'Ошибка вызова функции');
      }

      if (!data) {
        throw new Error('Пустой ответ от AI');
      }

      // Проверяем наличие error в data
      if ((data as any).error) {
        throw new Error((data as any).error);
      }

      setAISuggestions(data as AIProjectSuggestions);
      
      toast({
        title: '✨ Концепция готова',
        description: `Создан проект "${(data as any).name}" с ${(data as any).planned_tracks?.length || 0} треками`,
      });

      logger.info('Project concept generated', 'useAIProjectCreation', { 
        name: (data as any).name,
        trackCount: (data as any).planned_tracks?.length || 0
      });

      return data as AIProjectSuggestions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      logger.error('Failed to generate project concept', error as Error, 'useAIProjectCreation');
      
      toast({
        title: 'Ошибка генерации концепции',
        description: errorMessage.includes('429') ? 'Слишком много запросов. Попробуйте позже.' :
                     errorMessage.includes('402') ? 'Требуется пополнение баланса.' :
                     errorMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const clearSuggestions = useCallback(() => {
    setAISuggestions(null);
  }, []);

  return {
    generateConcept,
    isGenerating,
    aiSuggestions,
    clearSuggestions,
  };
};
