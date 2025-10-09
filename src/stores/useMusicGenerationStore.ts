import { create } from 'zustand';
import { ApiService, GenerateMusicRequest } from '@/services/api.service';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ToastFunction = (options: { title: string; description: string; variant?: 'destructive' | 'default' | null }) => void;

interface MusicGenerationState {
  isGenerating: boolean;
  isImproving: boolean;
  subscription: RealtimeChannel | null;
  generateMusic: (options: GenerateMusicRequest, toast: ToastFunction, onSuccess?: () => void) => Promise<boolean>;
  improvePrompt: (rawPrompt: string | undefined, toast: ToastFunction) => Promise<string | null>;
  cleanupSubscription: () => void;
}

export const useMusicGenerationStore = create<MusicGenerationState>((set, get) => ({
  isGenerating: false,
  isImproving: false,
  subscription: null,

  cleanupSubscription: () => {
    get().subscription?.unsubscribe();
    set({ subscription: null });
  },

  improvePrompt: async (rawPrompt, toast) => {
    const promptToImprove = typeof rawPrompt === 'string' ? rawPrompt.trim() : '';
    if (!promptToImprove) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, введите описание музыки для улучшения.',
        variant: 'destructive',
      });
      return null;
    }

    if (get().isImproving) return null;

    set({ isImproving: true });
    try {
      const response = await ApiService.improvePrompt({ prompt: promptToImprove });
      toast({
        title: '✨ Промпт улучшен!',
        description: 'Ваше описание было оптимизировано с помощью AI.',
      });
      return response.improvedPrompt;
    } catch (error) {
      logError('Ошибка при улучшении промпта', error as Error, 'useMusicGenerationStore');
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось улучшить промпт.',
        variant: 'destructive',
      });
      return null;
    } finally {
      set({ isImproving: false });
    }
  },

  generateMusic: async (options, toast, onSuccess) => {
    const { isGenerating, isImproving, cleanupSubscription } = get();
    const effectivePrompt = options.prompt?.trim() ?? '';

    if (!effectivePrompt) {
      toast({ title: 'Ошибка', description: 'Пожалуйста, введите описание музыки', variant: 'destructive' });
      return false;
    }

    if (isGenerating || isImproving) {
      toast({ title: 'Подождите', description: 'Предыдущая генерация ещё выполняется', variant: 'destructive' });
      return false;
    }

    cleanupSubscription();
    set({ isGenerating: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Требуется авторизация', description: 'Войдите в систему для генерации музыки', variant: 'destructive' });
        return false;
      }

      const newTrack = await ApiService.createTrack(
        user.id,
        options.title || effectivePrompt.substring(0, 50) || 'Untitled Track',
        effectivePrompt,
        options.provider || 'suno',
        options.lyrics,
        options.hasVocals,
        options.styleTags
      );

      await ApiService.generateMusic({
        trackId: newTrack.id,
        userId: user.id,
        ...options,
      });

      toast({
        title: '🎵 Генерация началась!',
        description: 'Ваш трек создаётся. Это может занять около минуты...',
      });

      onSuccess?.();

      const subscription = supabase
        .channel(`track-status:${newTrack.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tracks', filter: `id=eq.${newTrack.id}` },
          (payload) => {
            const updatedTrack = payload.new as { status: string; title: string; error_message?: string };
            if (updatedTrack.status === 'completed') {
              toast({
                title: '✅ Трек готов!',
                description: `Ваш трек "${updatedTrack.title}" успешно сгенерирован.`,
              });
              onSuccess?.();
              cleanupSubscription();
            } else if (updatedTrack.status === 'failed') {
              toast({
                title: '❌ Ошибка генерации',
                description: updatedTrack.error_message || 'Произошла ошибка при обработке вашего трека.',
                variant: 'destructive',
              });
              cleanupSubscription();
            }
          }
        )
        .subscribe();
      
      set({ subscription });
      return true;
    } catch (error) {
      logError('Ошибка при генерации музыки', error as Error, 'useMusicGenerationStore');
      const rawMessage = error instanceof Error ? error.message : 'Не удалось сгенерировать музыку.';
      const isNetworkError =
        typeof rawMessage === 'string' && (
          rawMessage.includes('Failed to fetch') ||
          rawMessage.includes('ERR_ABORTED') ||
          rawMessage.toLowerCase().includes('network')
        );

      toast({
        title: isNetworkError ? 'Проблема соединения' : 'Ошибка генерации',
        description: isNetworkError
          ? 'Нет связи с Supabase. Проверьте VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY, а также сетевые настройки/блокировщики.'
          : rawMessage,
        variant: 'destructive',
      });
      cleanupSubscription();
      return false;
    } finally {
      set({ isGenerating: false });
    }
  },
}));
