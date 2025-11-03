import { useCallback, useEffect, useState } from 'react';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useGenerateMusic } from '@/hooks/useGenerateMusic';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { logger } from '@/utils/logger';
import { getDefaultModel, type MusicProvider as ProviderType } from '@/config/provider-models';
import {
  useGeneratorState,
  useStemReferenceLoader,
  usePendingGenerationLoader,
  useAudioUploadHandler,
} from '@/components/generator/hooks';

export const useMusicGenerator = (onTrackGenerated?: () => void) => {
    const { selectedProvider, setProvider } = useMusicGenerationStore();
    const { toast } = useToast();
    const { vibrate } = useHapticFeedback();

    const { generate, isGenerating } = useGenerateMusic({
      provider: selectedProvider as ProviderType,
      onSuccess: onTrackGenerated,
      toast
    });

    const { savePrompt } = usePromptHistory();

    const state = useGeneratorState(selectedProvider);

    const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
    const [projectDialogOpen, setProjectDialogOpen] = useState(false);
    const [audioSourceDialogOpen, setAudioSourceDialogOpen] = useState(false);

    const audioUpload = useAudioUploadHandler(state);

    useEffect(() => {
      const timer = setTimeout(() => state.setParam('prompt', state.debouncedPrompt), 300);
      return () => clearTimeout(timer);
    }, [state.debouncedPrompt, state.setParam]);

    useEffect(() => {
      const timer = setTimeout(() => state.setParam('lyrics', state.debouncedLyrics), 300);
      return () => clearTimeout(timer);
    }, [state.debouncedLyrics, state.setParam]);

    useEffect(() => {
      if (!state.params.trackId) return;

      const channel = supabase
        .channel(`track_lyrics_${state.params.trackId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tracks',
            filter: `id=eq.${state.params.trackId}`,
          },
          (payload) => {
            const track = payload.new as any;
            if (
              track.metadata?.stage === 'lyrics_selection' &&
              track.metadata?.lyrics_job_id
            ) {
              logger.info('Mureka lyrics selection required', undefined, {
                trackId: track.id,
                jobId: track.metadata.lyrics_job_id
              });

              state.setMurekaLyricsDialog({
                open: true,
                trackId: track.id,
                jobId: track.metadata.lyrics_job_id
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [state.params.trackId, state.setMurekaLyricsDialog]);

    useEffect(() => {
      const defaultModel = getDefaultModel(selectedProvider as ProviderType);
      state.setParams(prev => {
        const newParams = {
          ...prev,
          provider: selectedProvider,
          modelVersion: defaultModel.value
        };

        if (selectedProvider === 'mureka' && prev.referenceAudioUrl) {
          logger.warn('Clearing reference audio for Mureka', 'MusicGeneratorV2', {
            previousProvider: prev.provider,
            hadReference: !!prev.referenceAudioUrl
          });

          toast({
            title: '⚠️ Референс удалён',
            description: 'Mureka не поддерживает референсное аудио',
            duration: 4000,
          });

          return {
            ...newParams,
            referenceAudioUrl: null,
            referenceFileName: null,
            referenceTrackId: null,
          };
        }

        return newParams;
      });
    }, [selectedProvider, toast, state.setParams]);

    const handleProviderChange = useCallback((provider: string) => {
        setProvider(provider as ProviderType);
    }, [setProvider]);

    useStemReferenceLoader(state, selectedProvider, handleProviderChange);
    usePendingGenerationLoader(state);

    const tempAudioUrl = state.pendingAudioFile ? URL.createObjectURL(state.pendingAudioFile) : '';

    return {
        state,
        isGenerating,
        personaDialogOpen,
        setPersonaDialogOpen,
        projectDialogOpen,
        setProjectDialogOpen,
        audioSourceDialogOpen,
        setAudioSourceDialogOpen,
        audioUpload,
        tempAudioUrl,
    };
};
