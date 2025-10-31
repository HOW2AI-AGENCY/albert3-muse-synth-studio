/**
 * Hook to load prefilled generation data from Zustand store
 */
import { useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import { logger } from '@/utils/logger';
import { useGenerationPrefillStore } from '@/stores/useGenerationPrefillStore';
import type { UseGeneratorStateReturn } from './useGeneratorState';

export const usePendingGenerationLoader = (state: UseGeneratorStateReturn) => {
  const consumePendingGeneration = useGenerationPrefillStore(
    store => store.consumePendingGeneration
  );

  useEffect(() => {
    const pending = consumePendingGeneration();
    
    if (!pending) return;
    
    logger.info('🎯 [PREFILL] Loading prefilled generation data', 'PendingGenerationLoader', {
      sourceType: pending.sourceType,
      hasPrompt: !!pending.prompt,
      hasLyrics: !!pending.lyrics,
      hasTitle: !!pending.title,
    });
    
    // Switch to custom mode
    state.setMode('custom');
    
    // Autofill form with prefilled data
    state.setParams(prev => ({
      ...prev,
      prompt: pending.prompt || prev.prompt,
      lyrics: pending.lyrics || prev.lyrics,
      title: pending.title || prev.title,
      tags: pending.tags || prev.tags,
    }));
    
    // Update debounced values
    state.setDebouncedPrompt(pending.prompt || '');
    state.setDebouncedLyrics(pending.lyrics || '');
    
    sonnerToast.success('Данные загружены', {
      description: `Источник: ${pending.sourceType === 'enhanced' ? 'AI улучшение' : pending.sourceType}`,
    });
  }, [consumePendingGeneration, state]);
};
