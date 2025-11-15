/**
 * Hook for music generation with realtime updates
 *
 * ✅ REFACTORED: Now uses RealtimeSubscriptionManager (P0-2 fix)
 * - Eliminates duplicate subscriptions
 * - Centralizedchannel management
 * - Automatic cleanup and deduplication
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GenerationService, GenerationRequest } from '@/services/generation';
import { logger } from '@/utils/logger';
import { rateLimiter, RATE_LIMIT_CONFIGS, formatResetTime } from '@/utils/rateLimiter';
import { supabase } from '@/integrations/supabase/client';
import RealtimeSubscriptionManager from '@/services/realtimeSubscriptionManager';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { MusicProvider } from '@/config/provider-models';
import type { Database } from '@/integrations/supabase/types';
import * as Sentry from '@sentry/react';
import { addBreadcrumb } from '@/utils/sentry';
import { trackGenerationEvent } from '@/utils/sentry-enhanced';

type TrackRow = Database['public']['Tables']['tracks']['Row'];

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

// ✅ FIX: Увеличено до 3 минут для стабильной работы realtime
const AUTO_CLEANUP_TIMEOUT = 3 * 60 * 1000; // 3 minutes
const DEBOUNCE_DELAY = 2000; // 2 seconds
const POLLING_INTERVAL = 10000; // 10 seconds
const MAX_POLLING_DURATION = 10 * 60 * 1000; // 10 minutes

export const useGenerateMusic = ({ provider = 'suno', onSuccess, toast }: UseGenerateMusicOptions) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null); // ✅ Changed to unsubscribe function
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);
  const lastGenerationTimeRef = useRef<number>(0);
  const currentTrackIdRef = useRef<string | null>(null);

  // Cleanup subscription, timers and polling
  const cleanup = useCallback(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    // ✅ Call unsubscribe function instead of channel.unsubscribe()
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    currentTrackIdRef.current = null;
    pollingStartTimeRef.current = 0;
  }, []);

  // Polling fallback for stuck tracks
  const startPolling = useCallback((trackId: string) => {
    if (!trackId) return;
    
    pollingStartTimeRef.current = Date.now();
    currentTrackIdRef.current = trackId;
    
    const pollTrack = async () => {
      const elapsedTime = Date.now() - pollingStartTimeRef.current;
      
      // Stop polling if max duration exceeded
      if (elapsedTime > MAX_POLLING_DURATION) {
        logger.warn('Polling timeout reached', 'useGenerateMusic', { trackId, elapsedTime });
        cleanup();
        return;
      }
      
      try {
        const { data: track, error } = await supabase
          .from('tracks')
          .select('id, title, status, error_message')
          .eq('id', trackId)
          .single();
        
        if (error) throw error;
        
        if (track?.status === 'completed') {
          logger.info('✅ Track completed (polling)', 'useGenerateMusic', { trackId });
          toast({
            title: '✅ Трек готов!',
            description: `Ваш трек "${track.title}" успешно сгенерирован.`,
          });
          onSuccess?.();
          cleanup();
          return;
        } else if (track && track.status === 'failed') {
          logger.error('❌ Track failed (polling)', new Error('Track generation failed'), 'useGenerateMusic', { 
            trackId,
            errorMessage: track.error_message 
          });
          toast({
            title: '❌ Ошибка генерации',
            description: `К сожалению, не удалось сгенерировать трек. ${track.error_message || 'Попробуйте изменить промпт или выбрать другую модель.'}`,
            variant: 'destructive',
          });
          setIsGenerating(false);
          cleanup();
          return;
        }
        
        // Continue polling if still processing
        if (track && (track.status === 'processing' || track.status === 'pending')) {
          pollingTimerRef.current = setTimeout(pollTrack, POLLING_INTERVAL);
        } else if (!track) {
          logger.warn('Track not found during polling', 'useGenerateMusic', { trackId });
          cleanup();
        }
      } catch (error) {
        logger.error('Polling error', error as Error, 'useGenerateMusic', { trackId });
        // Continue polling despite errors
        pollingTimerRef.current = setTimeout(pollTrack, POLLING_INTERVAL);
      }
    };
    
    // Start first poll
    pollTrack();
  }, [cleanup, toast, onSuccess]);

  // ✅ REFACTORED: Setup realtime subscription via RealtimeSubscriptionManager
  const setupSubscription = useCallback((trackId: string, isCached: boolean = false) => {
    cleanup();

    // ✅ Пропускаем подписку для закешированных треков
    if (isCached) {
      logger.info('Skipping subscription for cached track', 'useGenerateMusic', { trackId });
      return;
    }

    // Subscribe via centralized manager
    const unsubscribe = RealtimeSubscriptionManager.subscribeToTrack<TrackRow>(
      trackId,
      (payload: RealtimePostgresChangesPayload<TrackRow>) => {
        const track = payload.new as TrackRow;
        if (!track || !track.id) return;

        logger.info('Track update received via manager', 'useGenerateMusic', {
          trackId,
          status: track.status,
        });

        if (track.status === 'completed') {
          trackGenerationEvent('completed', trackId, provider, {
            duration: track.duration ?? undefined,
          });
          toast({
            title: '✅ Трек готов!',
            description: `Ваш трек "${track.title || 'Новый трек'}" успешно сгенерирован.`,
          });
          setIsGenerating(false);
          onSuccess?.();
          cleanup();
        } else if (track.status === 'failed') {
          trackGenerationEvent('failed', trackId, provider, {
            errorMessage: track.error_message ?? undefined,
          });
          toast({
            title: '❌ Ошибка генерации',
            description: track.error_message || 'Произошла ошибка при обработке вашего трека.',
            variant: 'destructive',
          });
          setIsGenerating(false);
          cleanup();
        }
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Auto-cleanup after timeout, then start polling as fallback
    cleanupTimerRef.current = setTimeout(() => {
      logger.warn('Auto-cleaning stale subscription after 3 minutes, starting polling fallback', 'useGenerateMusic', { trackId });

      // Unsubscribe from realtime
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Start polling as fallback
      startPolling(trackId);
    }, AUTO_CLEANUP_TIMEOUT);
  }, [cleanup, toast, onSuccess, startPolling, provider]);

  // Main generation function
  const generate = useCallback(async (options: GenerationRequest): Promise<boolean> => {
    const effectivePrompt = options.prompt?.trim() ?? '';
    const effectiveProvider = options.provider || provider;

    logger.info('🎸 [HOOK] Generation request received', 'useGenerateMusic', {
      promptLength: effectivePrompt.length,
      provider: effectiveProvider,
      hasLyrics: !!options.lyrics,
      lyricsLength: options.lyrics?.length || 0,
      isCyrillic: /[А-Яа-яЁё]/.test(effectivePrompt),
    });

    // Add Sentry breadcrumb
    addBreadcrumb('Music generation started', 'generation', {
      provider: effectiveProvider,
      prompt: effectivePrompt.slice(0, 50),
      hasVocals: options.hasVocals,
      hasLyrics: !!options.lyrics,
    });

    // Set Sentry tags & track event
    Sentry.setTag('generation.provider', effectiveProvider);
    Sentry.setTag('generation.has_vocals', options.hasVocals || false);
    trackGenerationEvent('started', 'pending', effectiveProvider, {
      prompt: effectivePrompt,
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

    // ✅ Rate limiting check
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const rateLimit = rateLimiter.check(user.id, RATE_LIMIT_CONFIGS.GENERATION);
      
      if (!rateLimit.allowed) {
        const resetTime = formatResetTime(rateLimit.resetAt);
        logger.warn('[HOOK] Rate limit exceeded', 'useGenerateMusic', {
          userId: user.id,
          resetAt: rateLimit.resetAt,
        });
        
        toast({
          title: '⏱️ Превышен лимит запросов',
          description: `Вы можете создать не более ${RATE_LIMIT_CONFIGS.GENERATION.maxRequests} треков в минуту. Попробуйте снова через ${resetTime}.`,
          variant: 'destructive',
        });
        return false;
      }
      
      logger.info('[HOOK] Rate limit OK', 'useGenerateMusic', {
        remaining: rateLimit.remaining,
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      });
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

      // ✅ FIX: Validate result.success before accessing taskId
      if (!result.success) {
        const errorMsg = result.error || 'Генерация не удалась';
        logger.error('[HOOK] Generation failed', new Error(errorMsg), 'useGenerateMusic', {
          trackId: result.trackId,
          provider: effectiveProvider,
        });

        toast({
          title: 'Ошибка инициализации генерации',
          description: `${errorMsg}. Пожалуйста, проверьте свой запрос и попробуйте снова.`,
          variant: 'destructive',
        });

        cleanup();
        return false;
      }

      // ✅ FIX: Validate trackId presence
      if (!result.trackId || typeof result.trackId !== 'string' || result.trackId.trim().length === 0) {
        const error = new Error('Invalid track ID received from server');
        logger.error('[HOOK] Invalid track ID', error, 'useGenerateMusic', {
          result,
          provider: effectiveProvider,
        });

        toast({
          title: 'Внутренняя ошибка сервера',
          description: 'Сервер вернул некорректный идентификатор трека. Пожалуйста, попробуйте позже.',
          variant: 'destructive',
        });

        cleanup();
        return false;
      }

      // ✅ FIX: Validate taskId before proceeding (unless cached)
      const isCachedResult = result.taskId === 'cached';

      if (!isCachedResult) {
        // For new generations, taskId must be present and valid
        if (!result.taskId || typeof result.taskId !== 'string' || result.taskId.trim().length === 0) {
          const error = new Error('Invalid task ID received from server');
          logger.error('[HOOK] Invalid task ID validation failed', error, 'useGenerateMusic', {
            trackId: result.trackId,
            taskId: result.taskId,
            provider: effectiveProvider,
          });

          toast({
            title: 'Внутренняя ошибка сервера',
            description: 'Сервер вернул некорректный идентификатор задачи. Пожалуйста, попробуйте еще раз.',
            variant: 'destructive',
          });

          cleanup();
          return false;
        }

        logger.info('[HOOK] Task ID validation passed', 'useGenerateMusic', {
          taskId: result.taskId,
          taskIdLength: result.taskId.length,
        });
      }

      if (isCachedResult) {
        // Show toast with info about cached track
        toast({
          title: '⚡ Трек найден!',
          description: 'Используется ранее созданный трек с такими же параметрами. Откройте Библиотеку для просмотра.',
        });
        
        // Log option to force new generation
        logger.info('Cached track returned. User can force new generation by adding forceNew: true', 'useGenerateMusic', {
          cachedTrackId: result.trackId,
        });

        // Sentry breadcrumb for cached
        addBreadcrumb('Music generation cached', 'generation', {
          trackId: result.trackId,
        });
      } else {
        toast({
          title: '🎵 Генерация началась!',
          description: 'Ваш трек создаётся. Это может занять около минуты...',
        });

        // Sentry breadcrumb for new generation
        addBreadcrumb('Music generation initiated', 'generation', {
          trackId: result.trackId,
          taskId: result.taskId,
        });
      }

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

      // Capture to Sentry with context
      Sentry.captureException(error, {
        tags: {
          'generation.provider': effectiveProvider,
          'generation.prompt_length': effectivePrompt.length,
        },
        extra: {
          prompt: effectivePrompt,
          hasVocals: options.hasVocals,
          hasLyrics: !!options.lyrics,
        },
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

  // Auto-cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    generate,
    isGenerating,
    cleanup,
  };
};
