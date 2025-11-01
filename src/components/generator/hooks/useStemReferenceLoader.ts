/**
 * Hook to load stem references from localStorage on mount
 */
import { useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import { logger } from '@/utils/logger';
import type { UseGeneratorStateReturn } from './useGeneratorState';

interface StemReferenceData {
  stemType: string;
  audioUrl: string;
  prompt?: string;
  lyrics?: string;
  styleTags?: string[];
  trackId?: string;
}

export const useStemReferenceLoader = (
  state: UseGeneratorStateReturn,
  selectedProvider: string,
  setProvider: (provider: string) => void
) => {
  useEffect(() => {
    const pendingRef = localStorage.getItem('pendingStemReference');
    if (!pendingRef) return;

    try {
      const refData: StemReferenceData = JSON.parse(pendingRef);
      
      logger.info('🎯 [STEM-REF] Loading stem reference', 'StemReferenceLoader', {
        stemType: refData.stemType,
        audioUrl: refData.audioUrl?.substring(0, 50),
        hasPrompt: !!refData.prompt,
        hasLyrics: !!refData.lyrics,
        hasTags: !!refData.styleTags,
      });
      
      // Switch to custom mode
      state.setMode('custom');
      
      // Switch to Suno if needed (Mureka doesn't support reference audio)
      if (selectedProvider === 'mureka') {
        setProvider('suno' as any);
      }
      
      // Auto-fill form from reference stem
      state.setParams(prev => ({
        ...prev,
        prompt: refData.prompt || prev.prompt,
        lyrics: refData.lyrics || prev.lyrics,
        tags: refData.styleTags?.join(', ') || prev.tags,
        referenceAudioUrl: refData.audioUrl,
        referenceFileName: `${refData.stemType}.mp3`,
        referenceTrackId: refData.trackId,
        provider: 'suno', // Mureka doesn't support reference
      }));
      
      // Update debounced values
      state.setDebouncedPrompt(refData.prompt || '');
      state.setDebouncedLyrics(refData.lyrics || '');
      
      // Clear after use
      localStorage.removeItem('pendingStemReference');
      
      sonnerToast.success('Референс загружен', {
        description: `Стем "${refData.stemType}" установлен как основа для генерации`,
      });
      
    } catch (error) {
      logger.error('[STEM-REF] Failed to load stem reference', error as Error, 'StemReferenceLoader');
      localStorage.removeItem('pendingStemReference');
      sonnerToast.error('Не удалось загрузить референс из стема');
    }
  }, [selectedProvider, setProvider, state]);
};
