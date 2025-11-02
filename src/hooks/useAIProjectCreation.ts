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
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from AI');
      }

      setAISuggestions(data as AIProjectSuggestions);
      
      toast({
        title: '✨ Концепция готова',
        description: 'AI сгенерировал идею проекта',
      });

      logger.info('Project concept generated', 'useAIProjectCreation', { 
        name: data.name,
        trackCount: data.planned_tracks?.length || 0
      });

      return data as AIProjectSuggestions;
    } catch (error) {
      logger.error('Failed to generate project concept', error as Error, 'useAIProjectCreation');
      
      toast({
        title: 'Ошибка генерации',
        description: 'Не удалось создать концепцию проекта',
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
