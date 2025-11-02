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
    recognition?: any;
    description?: any;
    flamingo?: any; // ✅ НОВОЕ: результаты Audio Flamingo 3
  }) => {
    logger.info('🔍 [ANALYSIS] Processing analysis results', 'AnalysisMapper', {
      hasRecognition: !!result.recognition,
      hasDescription: !!result.description,
      hasFlamingo: !!result.flamingo,
      hasLyricsInRecognition: !!result.recognition?.metadata?.lyrics_text,
      hasLyricsInFlamingo: !!result.flamingo?.parsed?.lyrics
    });

    // ✅ Auto-switch to custom mode when analysis completes
    if (state.mode === 'simple') {
      state.setMode('custom');
      logger.info('🔄 [ANALYSIS] Auto-switched to custom mode', 'AnalysisMapper');
      sonnerToast.info('Режим изменён', {
        description: 'Переключено в расширенный режим для применения анализа'
      });
    }

    const updates: any = {};

    // ✅ 1. Приоритет: Flamingo > Description > Recognition
    // Flamingo даёт самый детальный анализ
    if (result.flamingo?.parsed) {
      const flamingo = result.flamingo.parsed;
      
      // Формируем style tags из жанра и настроения
      const tags = [
        flamingo.genre,
        flamingo.mood,
        ...(flamingo.instruments || []).slice(0, 3) // Берём топ-3 инструмента
      ].filter(Boolean);

      if (tags.length > 0) {
        const existingTags = state.params.tags.split(',').map(t => t.trim()).filter(Boolean);
        const uniqueTags = Array.from(new Set([...existingTags, ...tags]));
        updates.tags = uniqueTags.join(', ');
        state.setParam('tags', updates.tags);
      }

      // Формируем промпт из AI описания Flamingo
      if (flamingo.rawText) {
        // Берём первые 500 символов как описание
        const description = flamingo.rawText.substring(0, 500);
        updates.prompt = description;
        state.setParam('prompt', description);
        state.setDebouncedPrompt(description);
      } else if (flamingo.genre || flamingo.mood) {
        const parts = [
          flamingo.genre && `${flamingo.genre} track`,
          flamingo.mood && `with ${flamingo.mood} mood`,
          flamingo.tempo_bpm && `at ${flamingo.tempo_bpm} BPM`,
          flamingo.key && `in ${flamingo.key}`,
        ].filter(Boolean);
        
        updates.prompt = parts.join(' ');
        state.setParam('prompt', updates.prompt);
        state.setDebouncedPrompt(updates.prompt);
      }

      // Сохраняем analyzed data для отображения
      state.setParams(prev => ({
        ...prev,
        analyzedGenre: flamingo.genre,
        analyzedMood: flamingo.mood,
        analyzedTempo: flamingo.tempo_bpm,
        analyzedInstruments: flamingo.instruments,
        analyzedDescription: flamingo.rawText,
      }));

      logger.info('✅ [ANALYSIS] Flamingo analysis applied', 'AnalysisMapper', {
        genre: flamingo.genre,
        mood: flamingo.mood,
        tempo: flamingo.tempo_bpm,
        hasLyrics: !!flamingo.lyrics
      });

      sonnerToast.success('🎧 Flamingo анализ применён', {
        description: `${flamingo.genre || 'Unknown'} · ${flamingo.mood || 'Unknown'}${flamingo.tempo_bpm ? ` · ${flamingo.tempo_bpm} BPM` : ''}`
      });

      // Применяем тексты из Flamingo (если есть)
      if (flamingo.lyrics && flamingo.lyrics !== 'instrumental') {
        updates.lyrics = flamingo.lyrics;
        state.setParam('lyrics', flamingo.lyrics);
        state.setDebouncedLyrics(flamingo.lyrics);

        logger.info('✅ [ANALYSIS] Flamingo lyrics applied', 'AnalysisMapper', {
          lyricsLength: flamingo.lyrics.length,
          linesCount: flamingo.lyrics.split('\n').length
        });

        sonnerToast.success('📝 Тексты извлечены (Flamingo)', {
          description: `${flamingo.lyrics.split('\n').filter(Boolean).length} строк текста применено`
        });
      }
    } 
    // ✅ 2. Fallback на Mureka description
    else if (result.description) {
      const desc = result.description;
      
      // Формируем style tags из жанра и настроения
      const tags = [
        desc.detected_genre,
        desc.detected_mood,
        ...(desc.detected_instruments || []).slice(0, 2)
      ].filter(Boolean);

      if (tags.length > 0) {
        // Merge with existing tags
        const existingTags = state.params.tags.split(',').map(t => t.trim()).filter(Boolean);
        const uniqueTags = Array.from(new Set([...existingTags, ...tags]));
        updates.tags = uniqueTags.join(', ');
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

    // ✅ 3. Применяем recognition (извлечённые lyrics) → в поле lyrics (только если нет Flamingo)
    if (!result.flamingo?.parsed?.lyrics && result.recognition?.metadata?.lyrics_text) {
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
