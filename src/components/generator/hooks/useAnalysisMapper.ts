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
    logger.info('🔍 [ANALYSIS] Processing analysis results', 'AnalysisMapper', {
      hasRecognition: !!result.recognition,
      hasDescription: !!result.description,
      hasLyricsInRecognition: !!result.recognition?.metadata?.lyrics_text
    });

    const updates: any = {};

    // ✅ 1. Применяем description (жанр, настроение, инструменты) → в prompt/tags
    if (result.description) {
      const desc = result.description;
      
      // Формируем style tags из жанра и настроения
      const tags = [
        desc.detected_genre,
        desc.detected_mood,
        ...(desc.detected_instruments || []).slice(0, 2)
      ].filter(Boolean);

      if (tags.length > 0) {
        updates.tags = tags.join(', ');
        state.setParam('tags', updates.tags);
      }

      // Формируем prompt из AI описания
      if (desc.ai_description) {
        updates.prompt = desc.ai_description;
        state.setParam('prompt', desc.ai_description);
        state.setDebouncedPrompt(desc.ai_description);
      } else if (desc.detected_genre || desc.detected_mood) {
        const parts = [
          desc.detected_genre && `${desc.detected_genre} track`,
          desc.detected_mood && `with ${desc.detected_mood} mood`,
          desc.tempo_bpm && `at ${desc.tempo_bpm} BPM`
        ].filter(Boolean);
        
        updates.prompt = parts.join(' ');
        state.setParam('prompt', updates.prompt);
        state.setDebouncedPrompt(updates.prompt);
      }

      // Сохраняем analyzed data для отображения
      state.setParams(prev => ({
        ...prev,
        analyzedGenre: desc.detected_genre,
        analyzedMood: desc.detected_mood,
        analyzedTempo: desc.tempo_bpm,
        analyzedInstruments: desc.detected_instruments,
        analyzedDescription: desc.ai_description,
      }));

      logger.info('✅ [ANALYSIS] Description applied', 'AnalysisMapper', {
        genre: desc.detected_genre,
        mood: desc.detected_mood,
        tempo: desc.tempo_bpm
      });

      sonnerToast.success('📊 Описание применено', {
        description: `${desc.detected_genre || 'Unknown'} · ${desc.detected_mood || 'Unknown'}${desc.tempo_bpm ? ` · ${desc.tempo_bpm} BPM` : ''}`
      });
    }

    // ✅ 2. Применяем recognition (извлечённые lyrics) → в поле lyrics
    if (result.recognition?.metadata?.lyrics_text) {
      const lyricsText = result.recognition.metadata.lyrics_text;
      
      updates.lyrics = lyricsText;
      state.setParam('lyrics', lyricsText);
      state.setDebouncedLyrics(lyricsText);

      logger.info('✅ [ANALYSIS] Lyrics extracted and applied', 'AnalysisMapper', {
        lyricsLength: lyricsText.length,
        linesCount: lyricsText.split('\n').length
      });

      sonnerToast.success('📝 Текст извлечён', {
        description: `${lyricsText.split('\n').filter(Boolean).length} строк текста применено`
      });
    } else if (result.recognition?.recognized_title && !state.params.lyrics.trim()) {
      // Fallback: попытка найти lyrics в БД по названию (старая логика)
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
          
          logger.info('✅ [ANALYSIS] Lyrics found in database', 'AnalysisMapper', {
            sourceTrack: tracksWithLyrics.title
          });
          
          sonnerToast.success('Лирика найдена', {
            description: 'Текст песни загружен из библиотеки',
          });
        }
      } catch (error) {
        logger.warn('[ANALYSIS] Failed to find lyrics', 'AnalysisMapper', { error: String(error) });
      }
    }

    if (Object.keys(updates).length === 0) {
      logger.warn('⚠️ [ANALYSIS] No data to apply', 'AnalysisMapper');
    }
  }, [state]);

  return {
    handleAnalysisComplete,
  };
};
