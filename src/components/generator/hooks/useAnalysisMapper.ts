/**
 * Hook for mapping analysis results to generation parameters
 */
import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { UseGeneratorStateReturn } from './useGeneratorState';

export const useAnalysisMapper = (state: UseGeneratorStateReturn) => {
  const handleAnalysisComplete = useCallback(async (result: {
    recognition: any;
    description: any;
  }) => {
    const { mapAnalysisToGenerationParams } = await import('@/utils/analysis-mapper');
    
    logger.info('🔍 [ANALYSIS] Analysis completed', 'AnalysisMapper', {
      hasRecognition: !!result.recognition,
      hasDescription: !!result.description
    });

    // Use mapper to get updates
    const mappingResult = mapAnalysisToGenerationParams(
      result.recognition,
      result.description,
      state.params
    );

    // Apply updates
    if (Object.keys(mappingResult.updates).length > 0) {
      // Apply title
      if (mappingResult.updates.title) {
        state.setParam('title', mappingResult.updates.title);
      }

      // Apply tags
      if (mappingResult.updates.tags) {
        state.setParam('tags', mappingResult.updates.tags);
      }

      // Apply prompt
      if (mappingResult.updates.prompt) {
        state.setParam('prompt', mappingResult.updates.prompt);
        state.setDebouncedPrompt(mappingResult.updates.prompt);
      }

      // Save analyzed data for indication
      if (result.description?.detected_genre) {
        state.setParams(prev => ({
          ...prev,
          analyzedGenre: result.description.detected_genre,
          analyzedMood: result.description.detected_mood,
          analyzedTempo: result.description.tempo_bpm,
          analyzedInstruments: result.description.detected_instruments,
          analyzedDescription: result.description.ai_description,
        }));
      }

      logger.info('✅ [AUTO-APPLY] Analysis applied to form', 'AnalysisMapper', {
        appliedFields: mappingResult.appliedFields,
        skippedFields: mappingResult.skippedFields
      });

      sonnerToast.success('Анализ применён', {
        description: `Обновлено: ${mappingResult.appliedFields.join(', ')}`,
        duration: 4000,
      });
    }

    // Try to find lyrics in DB by title
    if (result.recognition?.recognized_title && !state.params.lyrics.trim()) {
      try {
        const searchTitle = result.recognition.recognized_title.toLowerCase();
        const { data: tracksWithLyrics } = await supabase
          .from('tracks')
          .select('lyrics, title')
          .or(`title.ilike.%${searchTitle}%`)
          .not('lyrics', 'is', null)
          .limit(1)
          .maybeSingle();

        if (tracksWithLyrics?.lyrics) {
          state.setParam('lyrics', tracksWithLyrics.lyrics);
          state.setDebouncedLyrics(tracksWithLyrics.lyrics);
          
          logger.info('✅ [AUTO-APPLY] Lyrics found in database', 'AnalysisMapper', {
            sourceTrack: tracksWithLyrics.title
          });
          
          sonnerToast.success('Лирика найдена', {
            description: 'Текст песни загружен из библиотеки',
          });
        } else {
          logger.info('💡 [AUTO-APPLY] Lyrics not found', 'AnalysisMapper');
          sonnerToast.info('Совет', {
            description: 'Лирика не найдена. Используйте "Генерировать текст" для создания',
            duration: 5000,
          });
        }
      } catch (error) {
        logger.warn('[AUTO-APPLY] Failed to find lyrics', 'AnalysisMapper', { error: String(error) });
      }
    }
  }, [state]);

  return {
    handleAnalysisComplete,
  };
};
