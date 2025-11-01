/**
 * @fileoverview Hook для анализа референсного аудио через Mureka AI
 * @description
 * Обеспечивает интеграцию с analyze-reference-audio edge function
 * для автоматического распознавания и описания загруженного аудио.
 * 
 * Поддерживает polling результатов с автоматическим обновлением через TanStack Query.
 * 
 * @module useReferenceAnalysis
 * @version 1.0.0
 * @since 2025-10-15
 * 
 * @example
 * ```typescript
 * const { analyzeAudio, isAnalyzing, recognition, description } = useReferenceAnalysis();
 * 
 * // Запустить анализ
 * await analyzeAudio({ audioUrl: 'https://...', trackId: '...' });
 * 
 * // recognition и description обновляются автоматически через polling
 * if (recognition?.recognized_title) {
 *   console.log('Распознано:', recognition.recognized_title, recognition.recognized_artist);
 * }
 * ```
 */

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Параметры для запуска анализа
 */
export interface AnalyzeAudioParams {
  /** URL аудиофайла для анализа */
  audioUrl: string;
  /** ID трека (опционально) */
  trackId?: string;
}

/**
 * Ответ от edge function analyze-reference-audio
 */
export interface AnalyzeAudioResponse {
  success: boolean;
  recognitionId?: string;
  descriptionId?: string;
  uploadedFileId: string;
}

// ✅ Используем типы из БД
export type SongRecognition = Database['public']['Tables']['song_recognitions']['Row'];
export type SongDescription = Database['public']['Tables']['song_descriptions']['Row'];

/**
 * Комбинированные результаты анализа
 */
export interface ReferenceAnalysis {
  recognition: SongRecognition | null;
  description: SongDescription | null;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook для анализа референсного аудио
 * 
 * @returns Объект с функциями и состоянием анализа
 * 
 * @example
 * ```typescript
 * const {
 *   analyzeAudio,
 *   isAnalyzing,
 *   analysisResult,
 *   recognition,
 *   description,
 *   isPolling
 * } = useReferenceAnalysis();
 * 
 * // Запуск анализа
 * const result = await analyzeAudio({
 *   audioUrl: referenceAudioUrl,
 *   trackId: currentTrackId
 * });
 * 
 * // Автоматический polling через 5 секунд
 * // recognition и description обновляются автоматически
 * ```
 */
export function useReferenceAnalysis() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ============================================================================
  // STATE: IDs текущего анализа
  // ============================================================================

  const [currentRecognitionId, setCurrentRecognitionId] = React.useState<string | null>(null);
  const [currentDescriptionId, setCurrentDescriptionId] = React.useState<string | null>(null);

  // ============================================================================
  // MUTATION: Запуск анализа
  // ============================================================================

  const {
    mutateAsync: analyzeAudio,
    isPending: isAnalyzing,
    data: analysisResult,
    error: analysisError
  } = useMutation<AnalyzeAudioResponse, Error, AnalyzeAudioParams>({
    mutationKey: ['analyzeReferenceAudio'],
    mutationFn: async (params: AnalyzeAudioParams) => {
      logger.info('🔍 [ANALYZE] Starting reference audio analysis', 'useReferenceAnalysis', {
        audioUrl: params.audioUrl.substring(0, 100),
        trackId: params.trackId
      });

      // ✅ Проверяем сессию перед вызовом
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        logger.error('[ANALYZE] No active session', sessionError || new Error('No session'), 'useReferenceAnalysis');
        throw new Error('Необходима авторизация для анализа аудио');
      }

      logger.info('🔐 [ANALYZE] Session acquired', 'useReferenceAnalysis', {
        hasAccessToken: !!session.access_token,
        userId: session.user?.id.substring(0, 8)
      });

      const { data, error } = await supabase.functions.invoke('analyze-reference-audio', {
        body: params,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        logger.error('[ANALYZE] Edge function error', error, 'useReferenceAnalysis');
        throw error;
      }

      if (!data?.success) {
        throw new Error('Analysis failed');
      }

      logger.info('✅ [ANALYZE] Analysis initiated', 'useReferenceAnalysis', {
        recognitionId: data.recognitionId?.substring(0, 8),
        descriptionId: data.descriptionId?.substring(0, 8),
        uploadedFileId: data.uploadedFileId
      });

      return data;
    },
    onSuccess: (data) => {
      // ✅ Сохраняем IDs для polling
      if (data.recognitionId) {
        setCurrentRecognitionId(data.recognitionId);
      }
      if (data.descriptionId) {
        setCurrentDescriptionId(data.descriptionId);
      }

      toast({
        title: '🔍 Анализ запущен',
        description: 'Распознавание и описание аудио в процессе...',
        duration: 3000,
      });

      // ✅ Запуск polling queries
      queryClient.invalidateQueries({ queryKey: ['songRecognition'] });
      queryClient.invalidateQueries({ queryKey: ['songDescription'] });
    },
    onError: (error) => {
      logger.error('[ANALYZE] Analysis failed', error, 'useReferenceAnalysis');
      
      toast({
        title: '❌ Ошибка анализа',
        description: error.message || 'Не удалось проанализировать аудио',
        variant: 'destructive',
      });
    }
  });

  // ============================================================================
  // QUERY: Polling Recognition результатов
  // ============================================================================

  const {
    data: recognition,
    isLoading: isLoadingRecognition,
    error: recognitionError
  } = useQuery<SongRecognition | null, Error>({
    queryKey: ['songRecognition', currentRecognitionId],
    queryFn: async () => {
      if (!currentRecognitionId) return null;

      const { data, error } = await supabase
        .from('song_recognitions')
        .select('*')
        .eq('id', currentRecognitionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentRecognitionId,
    // ✅ Polling каждые 5 секунд пока статус не 'completed' или 'failed'
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.status === 'completed' || data.status === 'failed') {
        return false; // Останавливаем polling
      }
      return 5000; // 5 секунд
    },
    refetchIntervalInBackground: true,
  });

  // ============================================================================
  // QUERY: Polling Description результатов
  // ============================================================================

  const {
    data: description,
    isLoading: isLoadingDescription,
    error: descriptionError
  } = useQuery<SongDescription | null, Error>({
    queryKey: ['songDescription', currentDescriptionId],
    queryFn: async () => {
      if (!currentDescriptionId) return null;

      const { data, error } = await supabase
        .from('song_descriptions')
        .select('*')
        .eq('id', currentDescriptionId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentDescriptionId,
    // ✅ Polling каждые 5 секунд пока статус не 'completed' или 'failed'
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.status === 'completed' || data.status === 'failed') {
        return false; // Останавливаем polling
      }
      return 5000; // 5 секунд
    },
    refetchIntervalInBackground: true,
  });

  // ============================================================================
  // EFFECTS: Toast notifications при завершении
  // ============================================================================

  React.useEffect(() => {
    if (recognition?.status === 'completed' && recognition.recognized_title) {
      toast({
        title: '✅ Песня распознана',
        description: `"${recognition.recognized_title}" - ${recognition.recognized_artist}`,
        duration: 5000,
      });

      logger.info('✅ [ANALYZE] Recognition completed', 'useReferenceAnalysis', {
        title: recognition.recognized_title,
        artist: recognition.recognized_artist,
        confidence: recognition.confidence_score
      });
    }

    if (recognition?.status === 'failed') {
      toast({
        title: '⚠️ Распознавание не удалось',
        description: recognition.error_message || 'Не удалось распознать песню',
        variant: 'destructive',
      });
    }
  }, [recognition?.status, toast]);

  React.useEffect(() => {
    if (description?.status === 'completed' && description.detected_genre) {
      toast({
        title: '✅ Описание готово',
        description: `${description.detected_genre} · ${description.detected_mood}${description.tempo_bpm ? ` · ${description.tempo_bpm} BPM` : ''}`,
        duration: 5000,
      });

      logger.info('✅ [ANALYZE] Description completed', 'useReferenceAnalysis', {
        genre: description.detected_genre,
        mood: description.detected_mood,
        tempo: description.tempo_bpm
      });
    }

    if (description?.status === 'failed') {
      toast({
        title: '⚠️ Описание не удалось',
        description: description.error_message || 'Не удалось проанализировать аудио',
        variant: 'destructive',
      });
    }
  }, [description?.status, toast]);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const isPolling = (
    (recognition?.status === 'pending' || recognition?.status === 'processing') ||
    (description?.status === 'pending' || description?.status === 'processing')
  );

  const isCompleted = (
    recognition?.status === 'completed' && 
    description?.status === 'completed'
  );

  const hasFailed = (
    recognition?.status === 'failed' || 
    description?.status === 'failed'
  );

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // ✅ Основная функция анализа
    analyzeAudio,
    isAnalyzing,
    analysisResult,
    analysisError,

    // ✅ Результаты распознавания
    recognition,
    isLoadingRecognition,
    recognitionError,

    // ✅ Результаты описания
    description,
    isLoadingDescription,
    descriptionError,

    // ✅ Комбинированные состояния
    isPolling,
    isCompleted,
    hasFailed,

    // ✅ Функция для ручного сброса
    reset: () => {
      setCurrentRecognitionId(null);
      setCurrentDescriptionId(null);
    }
  };
}

