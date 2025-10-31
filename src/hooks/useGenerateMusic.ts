/**
 * Hook for music generation with realtime updates
 * Now uses unified GenerationService for better separation of concerns
 */

import { useState, useCallback, useRef } from 'react';
import { GenerationService, GenerationRequest } from '@/services/generation';
import { logger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MusicProvider } from '@/config/provider-models';

type ToastFunction = (options: { 
  title: string; 
  description: string; 
  variant?: 'destructive' | 'default' | null 
}) => void;

interface UseGenerateMusicOptions {
  provider?: MusicProvider;
  onSuccess?: () => void;
  toast: ToastFunction;
}

const AUTO_CLEANUP_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 2000; // 2 seconds

export const useGenerateMusic = ({ provider = 'suno', onSuccess, toast }: UseGenerateMusicOptions) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastGenerationTimeRef = useRef<number>(0);

  // Cleanup subscription and timer
  const cleanup = useCallback(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  }, []);

  // Setup realtime subscription for track status
  const setupSubscription = useCallback((trackId: string, isCached: boolean = false) => {
    cleanup();

    // ✅ Пропускаем подписку для закешированных треков
    if (isCached) {
      logger.info('Skipping subscription for cached track', 'useGenerateMusic', { trackId });
      return;
    }

    const subscription = GenerationService.subscribe(trackId, (status, trackData) => {
      if (status === 'completed') {
        toast({
          title: '✅ Трек готов!',
          description: `Ваш трек "${trackData?.title}" успешно сгенерирован.`,
        });
        onSuccess?.();
        cleanup();
      } else if (status === 'failed') {
        toast({
          title: '❌ Ошибка генерации',
          description: trackData?.errorMessage || 'Произошла ошибка при обработке вашего трека.',
          variant: 'destructive',
        });
        cleanup();
      }
    });

    subscriptionRef.current = subscription;

    // Auto-cleanup after timeout
    cleanupTimerRef.current = setTimeout(() => {
      logger.warn('Auto-cleaning stale subscription after 5 minutes');
      cleanup();
    }, AUTO_CLEANUP_TIMEOUT);
  }, [cleanup, toast, onSuccess]);

  // Main generation function
  const generate = useCallback(async (options: GenerationRequest): Promise<boolean> => {
    console.log('🎸 [HOOK DEBUG] generate() called!', { options });
    const effectivePrompt = options.prompt?.trim() ?? '';
    const effectiveProvider = options.provider || provider;

    logger.info('🎸 [HOOK] Generation request received', 'useGenerateMusic', {
      promptLength: effectivePrompt.length,
      provider: effectiveProvider,
      hasLyrics: !!options.lyrics,
      lyricsLength: options.lyrics?.length || 0,
      isCyrillic: /[А-Яа-яЁё]/.test(effectivePrompt),
    });

    // Validation
    if (!effectivePrompt) {
      logger.warn('[HOOK] Validation failed: empty prompt', 'useGenerateMusic');
      toast({ 
        title: 'Ошибка', 
        description: 'Пожалуйста, введите описание музыки', 
        variant: 'destructive' 
      });
      return false;
    }

    if (isGenerating) {
      logger.warn('[HOOK] Generation already in progress', 'useGenerateMusic');
      toast({ 
        title: 'Подождите', 
        description: 'Предыдущая генерация ещё выполняется', 
        variant: 'destructive' 
      });
      return false;
    }

    // Debounce protection
    const now = Date.now();
    if (now - lastGenerationTimeRef.current < DEBOUNCE_DELAY) {
      logger.warn('[HOOK] Debounce protection triggered', 'useGenerateMusic');
      return false;
    }
    lastGenerationTimeRef.current = now;

    cleanup();
    setIsGenerating(true);

    try {
      logger.info('[HOOK] Calling GenerationService...', 'useGenerateMusic', {
        provider: effectiveProvider,
      });

      // Use unified GenerationService
      const result = await GenerationService.generate({
        ...options,
        provider: effectiveProvider,
      });

      logger.info('[HOOK] GenerationService returned result', 'useGenerateMusic', {
        success: result.success,
        trackId: result.trackId,
        taskId: result.taskId,
        isCached: result.taskId === 'cached',
      });

      const isCachedResult = result.taskId === 'cached';

      toast({
        title: isCachedResult ? '⚡ Трек найден!' : '🎵 Генерация началась!',
        description: isCachedResult 
          ? 'Используется ранее созданный трек с такими же параметрами.' 
          : 'Ваш трек создаётся. Это может занять около минуты...',
      });

      // Setup realtime updates only for new generations
      setupSubscription(result.trackId, isCachedResult);
      onSuccess?.();

      return true;
    } catch (error) {
      logger.error('❌ [HOOK] Generation error caught', error as Error, 'useGenerateMusic', {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        provider: effectiveProvider,
      });
      
      const rawMessage = error instanceof Error ? error.message : 'Не удалось сгенерировать музыку.';
      const isNetworkError = typeof rawMessage === 'string' && (
        rawMessage.includes('Failed to fetch') ||
        rawMessage.includes('ERR_ABORTED') ||
        rawMessage.toLowerCase().includes('network')
      );

      toast({
        title: isNetworkError ? 'Проблема соединения' : 'Ошибка генерации',
        description: isNetworkError
          ? 'Нет связи с сервером. Проверьте подключение к интернету.'
          : rawMessage,
        variant: 'destructive',
      });
      
      cleanup();
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, provider, toast, onSuccess, cleanup, setupSubscription]);

  return {
    generate,
    isGenerating,
    cleanup,
  };
};
