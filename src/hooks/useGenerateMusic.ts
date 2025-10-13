/**
 * Hook for music generation with realtime updates
 * Extracted from useMusicGenerationStore for better separation of concerns
 */

import { useState, useCallback, useRef } from 'react';
import { ApiService, GenerateMusicRequest } from '@/services/api.service';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { MusicProvider } from '@/services/providers';

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
  const setupSubscription = useCallback((trackId: string) => {
    cleanup();

    const subscription = supabase
      .channel(`track-status:${trackId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tracks',
        filter: `id=eq.${trackId}`
      }, (payload) => {
        const updatedTrack = payload.new as { 
          status: string; 
          title: string; 
          error_message?: string 
        };

        if (updatedTrack.status === 'completed') {
          toast({
            title: '✅ Трек готов!',
            description: `Ваш трек "${updatedTrack.title}" успешно сгенерирован.`,
          });
          onSuccess?.();
          cleanup();
        } else if (updatedTrack.status === 'failed') {
          toast({
            title: '❌ Ошибка генерации',
            description: updatedTrack.error_message || 'Произошла ошибка при обработке вашего трека.',
            variant: 'destructive',
          });
          cleanup();
        }
      })
      .subscribe();

    subscriptionRef.current = subscription;

    // Auto-cleanup after timeout
    cleanupTimerRef.current = setTimeout(() => {
      logger.warn('Auto-cleaning stale subscription after 5 minutes');
      cleanup();
    }, AUTO_CLEANUP_TIMEOUT);
  }, [cleanup, toast, onSuccess]);

  // Main generation function
  const generate = useCallback(async (options: GenerateMusicRequest): Promise<boolean> => {
    const effectivePrompt = options.prompt?.trim() ?? '';
    const effectiveProvider = options.provider || provider;

    // Validation
    if (!effectivePrompt) {
      toast({ 
        title: 'Ошибка', 
        description: 'Пожалуйста, введите описание музыки', 
        variant: 'destructive' 
      });
      return false;
    }

    if (isGenerating) {
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
      return false;
    }
    lastGenerationTimeRef.current = now;

    cleanup();
    setIsGenerating(true);

    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ 
          title: 'Требуется авторизация', 
          description: 'Войдите в систему для генерации музыки', 
          variant: 'destructive' 
        });
        return false;
      }

      // Create track record
      const newTrack = await ApiService.createTrack(
        user.id,
        options.title || effectivePrompt.substring(0, 50) || 'Untitled Track',
        effectivePrompt,
        effectiveProvider,
        options.lyrics,
        options.hasVocals,
        options.styleTags
      );

      // Invoke generation function based on provider
      if (effectiveProvider === 'mureka') {
        await supabase.functions.invoke('generate-mureka', {
          body: {
            trackId: newTrack.id,
            title: options.title || effectivePrompt.substring(0, 50),
            prompt: effectivePrompt,
            lyrics: options.lyrics,
            styleTags: options.styleTags,
            hasVocals: options.hasVocals,
            modelVersion: options.modelVersion,
          }
        });
      } else {
        await ApiService.generateMusic({
          ...options,
          trackId: newTrack.id,
          userId: user.id,
          provider: effectiveProvider,
        });
      }

      toast({
        title: '🎵 Генерация началась!',
        description: 'Ваш трек создаётся. Это может занять около минуты...',
      });

      // Setup realtime updates
      setupSubscription(newTrack.id);
      onSuccess?.();

      return true;
    } catch (error) {
      logger.error('Ошибка при генерации музыки', error as Error);
      
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
