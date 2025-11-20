/**
 * Hook для анализа аудио через Audio Flamingo 3
 */
import { useState, useCallback } from 'react';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { toast as sonnerToast } from 'sonner';
import { logger } from '@/utils/logger';
import type { EdgeFunctionResponse } from '@/types/edge-functions';

export type AnalysisType = 'full' | 'quick' | 'lyrics' | 'instruments';

export interface FlamingoAnalysisResult {
  success: boolean;
  analysisType: AnalysisType;
  rawOutput: string;
  parsed: {
    rawText: string;
    genre?: string;
    mood?: string;
    tempo_bpm?: number;
    key?: string;
    instruments?: string[];
    vocals?: string;
    lyrics?: string;
    structure?: string;
    quality?: string;
  };
}

export const useAudioFlamingoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const analyzeAudio = useCallback(async (
    audioUrl: string,
    analysisType: AnalysisType = 'full'
  ): Promise<FlamingoAnalysisResult | null> => {
    if (!audioUrl) {
      sonnerToast.error('URL аудио не указан');
      return null;
    }

    setIsAnalyzing(true);
    setProgress(10);

    try {
      logger.info('🎧 [FLAMINGO] Starting audio analysis', 'AudioFlamingo', {
        audioUrl: audioUrl.substring(0, 50),
        analysisType
      });

      setProgress(30);

      const { data, error } = await SupabaseFunctions.invoke<EdgeFunctionResponse<FlamingoAnalysisResult>>('analyze-audio-flamingo', {
        body: { audioUrl, analysisType }
      });

      if (error) {
        logger.error('[FLAMINGO] Analysis failed', error, 'AudioFlamingo');
        sonnerToast.error('Ошибка анализа', {
          description: error.message || 'Не удалось проанализировать аудио'
        });
        return null;
      }

      setProgress(90);

      const result = data as FlamingoAnalysisResult;
      logger.info('✅ [FLAMINGO] Analysis complete', 'AudioFlamingo', {
        hasGenre: !!result.parsed?.genre,
        hasMood: !!result.parsed?.mood,
        hasTempo: !!result.parsed?.tempo_bpm,
        hasLyrics: !!result.parsed?.lyrics,
      });

      setProgress(100);

      sonnerToast.success('🎧 Анализ завершён', {
        description: `${result.parsed?.genre || 'Unknown'} · ${result.parsed?.mood || 'Unknown'}${result.parsed?.tempo_bpm ? ` · ${result.parsed.tempo_bpm} BPM` : ''}`
      });

      return result;
    } catch (error) {
      logger.error('[FLAMINGO] Unexpected error', error as Error, 'AudioFlamingo');
      sonnerToast.error('Неожиданная ошибка при анализе');
      return null;
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, []);

  return {
    analyzeAudio,
    isAnalyzing,
    progress,
  };
};
