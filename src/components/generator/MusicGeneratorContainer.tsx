import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast as sonnerToast } from 'sonner';
import type { MusicProvider as ProviderType } from '@/config/provider-models';
import { getProviderModels, getDefaultModel } from '@/config/provider-models';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useGenerateMusic } from '@/hooks/useGenerateMusic';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import {
  useGeneratorState,
  useStemReferenceLoader,
  usePendingGenerationLoader,
  useAudioUploadHandler,
} from '@/components/generator/hooks';
import { useMurekaLyricsSubscription } from '@/components/generator/hooks/useMurekaLyricsSubscription';
import type { MusicGeneratorV2Props } from '@/components/MusicGeneratorV2.types';
import { MusicGeneratorContent } from '@/components/generator/MusicGeneratorContent';

const MusicGeneratorContainerComponent = ({ onTrackGenerated }: MusicGeneratorV2Props) => {
  const { selectedProvider, setProvider } = useMusicGenerationStore();
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();

  const { generate, isGenerating } = useGenerateMusic({
    provider: selectedProvider as ProviderType,
    onSuccess: onTrackGenerated,
    toast,
  });

  const currentModels = getProviderModels(selectedProvider as ProviderType);
  const { savePrompt } = usePromptHistory();
  const { isMobile } = useBreakpoints();

  const state = useGeneratorState(selectedProvider);
  const { setParams } = state;

  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [audioSourceDialogOpen, setAudioSourceDialogOpen] = useState(false);

  usePendingGenerationLoader(state);

  const audioUpload = useAudioUploadHandler(state);

  // Избегаем прямой ссылки на объект state внутри эффекта
  const { setParam: setParamPrompt, debouncedPrompt } = state;
  useEffect(() => {
    const timer = setTimeout(() => setParamPrompt('prompt', debouncedPrompt), 300);
    return () => clearTimeout(timer);
  }, [debouncedPrompt, setParamPrompt]);

  const { setParam: setParamLyrics, debouncedLyrics } = state;
  useEffect(() => {
    const timer = setTimeout(() => setParamLyrics('lyrics', debouncedLyrics), 300);
    return () => clearTimeout(timer);
  }, [debouncedLyrics, setParamLyrics]);

  const handleLyricsStage = useCallback(
    ({ trackId, jobId }: { trackId: string; jobId: string }) => {
      state.setMurekaLyricsDialog({ open: true, trackId, jobId });
    },
    [state]
  );

  useMurekaLyricsSubscription({
    trackId: state.params.trackId,
    enabled: !!state.params.trackId,
    onLyricsStage: handleLyricsStage,
  });

  useEffect(() => {
    const defaultModel = getDefaultModel(selectedProvider as ProviderType);

    setParams((prev) => {
      const shouldUpdateProvider = prev.provider !== selectedProvider;
      const shouldUpdateModelVersion = prev.modelVersion !== defaultModel.value;
      const shouldClearReference = selectedProvider === 'mureka' && !!prev.referenceAudioUrl;

      if (!shouldUpdateProvider && !shouldUpdateModelVersion && !shouldClearReference) {
        return prev;
      }

      const nextParams = shouldUpdateProvider || shouldUpdateModelVersion
        ? {
            ...prev,
            provider: selectedProvider,
            modelVersion: defaultModel.value,
          }
        : prev;

      if (!shouldClearReference) {
        return nextParams;
      }

      logger.warn('Clearing reference audio for Mureka', 'MusicGeneratorContainer', {
        previousProvider: prev.provider,
        hadReference: !!prev.referenceAudioUrl,
      });

      toast({
        title: '⚠️ Референс удалён',
        description: 'Mureka не поддерживает референсное аудио',
        duration: 4000,
      });

      return {
        ...nextParams,
        referenceAudioUrl: null,
        referenceFileName: null,
        referenceTrackId: null,
      };
    });
  }, [selectedProvider, setParams, toast]);

  const handleMurekaLyricsSelect = useCallback(
    async (lyrics: string, variantId: string) => {
      if (!state.murekaLyricsDialog.trackId) return;

      try {
        logger.info('User selected Mureka lyrics variant', 'MusicGeneratorContainer', {
          trackId: state.murekaLyricsDialog.trackId,
          variantId,
        });

        const { error } = await supabase
          .from('tracks')
          .update({
            lyrics,
            metadata: {
              selected_lyrics_variant_id: variantId,
              stage: 'composing_music',
              stage_description: 'Создание музыки...',
            },
          })
          .eq('id', state.murekaLyricsDialog.trackId);

        if (error) throw error;

        sonnerToast.success('Текст выбран! Продолжаем создание музыки...', {
          duration: 3000,
        });

        state.setParam('lyrics', lyrics);
        state.setDebouncedLyrics(lyrics);
      } catch (error) {
        logger.error('Failed to apply lyrics variant', error as Error, 'MusicGeneratorContainer');
        sonnerToast.error('Ошибка применения текста');
      }
    },
    [state]
  );

  const handleProviderChange = useCallback(
    (provider: string) => {
      setProvider(provider as ProviderType);
    },
    [setProvider]
  );

  useStemReferenceLoader(state, selectedProvider, handleProviderChange);

  const handleGenerate = useCallback(async () => {
    vibrate('heavy');

    const hasPrompt = state.params.prompt.trim().length > 0;
    const hasLyrics = state.params.lyrics.trim().length > 0;
    const hasReferenceAudio = !!state.params.referenceAudioUrl;

    if (!hasPrompt && !hasLyrics) {
      toast({
        title: 'Заполните промпт или текст песни',
        description: 'Хотя бы одно поле должно быть заполнено',
        variant: 'destructive',
      });
      return;
    }

    if (hasReferenceAudio && !hasPrompt && !hasLyrics) {
      toast({
        title: 'Добавьте описание',
        description: 'Референсное аудио лучше работает с промптом или текстом',
        variant: 'destructive',
      });
      return;
    }

    if (hasLyrics && !hasPrompt) {
      toast({
        title: '💡 Совет',
        description: 'Добавьте описание стиля для лучшего результата',
        duration: 3000,
      });
    }

    const hasVocals = state.params.vocalGender !== 'instrumental';
    const vocalGenderParam =
      hasVocals && state.params.vocalGender !== 'any'
        ? (state.params.vocalGender.substring(0, 1) as 'f' | 'm')
        : undefined;

    const effectiveLyrics = hasVocals && state.params.lyrics.trim() ? state.params.lyrics.trim() : undefined;
    const hasLyricsContent = !!effectiveLyrics;

    const requestParams = {
      prompt: state.params.prompt.trim(),
      title: state.params.title.trim() || undefined,
      lyrics: effectiveLyrics,
      hasVocals,
      styleTags: state.params.tags.split(',').map((t) => t.trim()).filter(Boolean),
      negativeTags: state.params.negativeTags.trim() || undefined,
      weirdnessConstraint: state.params.weirdnessConstraint / 100,
      styleWeight: state.params.styleWeight / 100,
      lyricsWeight: hasLyricsContent ? state.params.lyricsWeight / 100 : undefined,
      audioWeight: state.params.referenceAudioUrl ? state.params.audioWeight / 100 : undefined,
      vocalGender: vocalGenderParam,
      customMode: hasLyricsContent,
      modelVersion: state.params.modelVersion,
      referenceAudioUrl: state.params.referenceAudioUrl || undefined,
      referenceTrackId: state.params.referenceTrackId || undefined,
      provider: selectedProvider,
      personaId: state.params.personaId || undefined,
      projectId: state.params.activeProjectId || undefined,
      inspoProjectId: state.params.inspoProjectId || undefined,
    };

    try {
      await savePrompt({
        prompt: state.params.prompt,
        lyrics: state.params.lyrics || undefined,
        style_tags: state.params.tags
          ? state.params.tags.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        provider: selectedProvider as 'suno' | 'mureka',
      });
    } catch (error) {
      logger.error('[MusicGeneratorContainer] Failed to save prompt', error as Error);
    }

    logger.info(
      '🎵 [GENERATE] Starting generation',
      'MusicGeneratorContainer',
      { prompt: !!state.params.prompt.trim(), lyrics: !!state.params.lyrics.trim(), audio: !!state.params.referenceAudioUrl, mode: state.mode }
    );

    const started = await generate(requestParams);
    if (started) {
      state.setParams((prev) => ({
        ...prev,
        title: '',
        prompt: '',
        lyrics: '',
        tags: '',
      }));
      state.setDebouncedPrompt('');
      state.setDebouncedLyrics('');
    }
  }, [
    generate,
    savePrompt,
    selectedProvider,
    state,
    toast,
    vibrate,
  ]);

  const handleBoostPrompt = useCallback(async () => {
    if (!state.params.prompt.trim()) return;

    state.setIsEnhancing(true);

    try {
      const { data, error } = await supabase.functions.invoke('improve-prompt', {
        body: {
          prompt: state.params.prompt,
          provider: selectedProvider,
        },
      });

      if (error) throw error;

      if (data?.enhancedPrompt) {
        state.setParam('prompt', data.enhancedPrompt);
        state.setDebouncedPrompt(data.enhancedPrompt);

        sonnerToast.success('Промпт улучшен!', {
          description: 'AI применил рекомендации',
          duration: 2000,
        });
      }
    } catch (error) {
      logger.error('Failed to boost prompt', error as Error, 'MusicGeneratorContainer');
      toast({
        variant: 'destructive',
        title: 'Ошибка улучшения',
        description: 'Не удалось улучшить промпт. Попробуйте позже.',
      });
    } finally {
      state.setIsEnhancing(false);
    }
  }, [selectedProvider, state, toast]);

  const handleEnhancedPromptAccept = useCallback(
    (finalPrompt: string) => {
      state.setParam('prompt', finalPrompt);
      state.setDebouncedPrompt(finalPrompt);
      state.setEnhancedPrompt(null);
      setTimeout(() => {
        void handleGenerate();
      }, 100);
    },
    [handleGenerate, state]
  );

  const handleEnhancedPromptReject = useCallback(() => {
    state.setEnhancedPrompt(null);
    setTimeout(() => {
      void handleGenerate();
    }, 100);
  }, [handleGenerate, state]);

  // Деструктурируем нужные части из state, чтобы избежать зависимости от всего объекта
  const { params, mode, setMode } = state;
  useEffect(() => {
    const hasAdvancedFeatures = !!params.referenceAudioUrl || !!params.personaId;

    if (hasAdvancedFeatures && mode === 'simple') {
      logger.info('Auto-switching to Custom Mode (advanced features detected)', 'MusicGeneratorContainer');
      setMode('custom');

      toast({
        title: 'Переключено на Custom Mode',
        description: 'Для Audio/Persona требуется Custom Mode',
        duration: 3000,
      });
    }
  }, [params.referenceAudioUrl, params.personaId, mode, setMode, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating) {
        e.preventDefault();
        void handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, isGenerating]);

  const tempAudioUrl = useMemo(() => {
    if (!state.pendingAudioFile) return '';
    return URL.createObjectURL(state.pendingAudioFile);
  }, [state.pendingAudioFile]);

  useEffect(() => {
    return () => {
      if (tempAudioUrl) {
        URL.revokeObjectURL(tempAudioUrl);
      }
    };
  }, [tempAudioUrl]);

  const handleAudioSelect = useCallback(
    (url: string, fileName: string) => {
      state.setParam('referenceAudioUrl', url);
      state.setParam('referenceFileName', fileName);
    },
    [state]
  );

  const handleReferenceTrackSelect = useCallback(
    (track: any) => {
      // ✅ Auto-fill form with reference track data
      if (track?.title) {
        state.setParam('title', `${track.title} (Ref)`);
      }

      if (track?.prompt) {
        state.setParam('prompt', track.prompt);
        state.setDebouncedPrompt(track.prompt);
      }

      if (track?.lyrics) {
        state.setParam('lyrics', track.lyrics);
        state.setDebouncedLyrics(track.lyrics);
      }

      if (track?.style_tags?.length > 0) {
        state.setParam('tags', track.style_tags.join(', '));
      }

      // Store reference track ID for tracking
      if (track?.id) {
        state.setParam('referenceTrackId', track.id);
      }

      logger.info('✅ Reference track data auto-filled', 'MusicGeneratorContainer', {
        trackId: track.id,
        hasTitle: !!track.title,
        hasPrompt: !!track.prompt,
        hasLyrics: !!track.lyrics,
        tagsCount: track.style_tags?.length || 0,
      });

      toast({
        title: '✅ Данные трека применены',
        description: `Название, промпт${track.lyrics ? ', лирика' : ''} и теги заполнены автоматически`,
        duration: 3000,
      });
    },
    [state, toast]
  );

  const handleLyricsGenerated = useCallback(
    (lyrics: string) => {
      state.setParam('lyrics', lyrics);
      state.setDebouncedLyrics(lyrics);
      state.setLyricsDialogOpen(false);
    },
    [state]
  );

  const handleHistorySelect = useCallback(
    (historyItem: { prompt: string; lyrics?: string; style_tags?: string[] }) => {
      state.setParam('prompt', historyItem.prompt);
      state.setDebouncedPrompt(historyItem.prompt);
      if (historyItem.lyrics) {
        state.setParam('lyrics', historyItem.lyrics);
        state.setDebouncedLyrics(historyItem.lyrics);
      }
      if (historyItem.style_tags?.length) {
        state.setParam('tags', historyItem.style_tags.join(', '));
      }
      state.setHistoryDialogOpen(false);
    },
    [state]
  );

  const handlePersonaSelect = useCallback(
    (personaId: string | null) => {
      state.setParam('personaId', personaId || undefined);
      setPersonaDialogOpen(false);
      if (personaId) {
        toast({
          title: 'Персона выбрана',
          description: 'Музыкальная персона будет применена к генерации',
        });
      }
    },
    [state, toast]
  );

  const handleProjectSelect = useCallback(
    (projectId: string | null) => {
      state.setParam('activeProjectId', projectId || undefined);
      setProjectDialogOpen(false);

      if (projectId && state.mode === 'simple') {
        state.setMode('custom');
      }

      if (projectId) {
        toast({
          title: 'Проект выбран',
          description: 'Проект будет использован для генерации',
        });
      }
    },
    [state, toast]
  );

  const handleQuickProjectClick = useCallback(() => {
    setProjectDialogOpen(true);
    if (state.mode === 'simple') {
      state.setMode('custom');
      toast({
        title: 'Переключено на Custom Mode',
        description: 'Выбор проекта и трека доступен в продвинутом режиме',
        duration: 3000,
      });
    }
  }, [state, toast]);

  const handleAudioPreviewOpenChange = useCallback(
    (open: boolean) => {
      state.setAudioPreviewOpen(open);
      if (!open) {
        state.setPendingAudioFile(null);
      }
    },
    [state]
  );

  const handleLyricsDialogOpenChange = useCallback(
    (open: boolean) => {
      state.setLyricsDialogOpen(open);
    },
    [state]
  );

  const handleHistoryDialogOpenChange = useCallback(
    (open: boolean) => {
      state.setHistoryDialogOpen(open);
    },
    [state]
  );

  const handleMurekaLyricsDialogChange = useCallback(
    (dialog: typeof state.murekaLyricsDialog) => {
      state.setMurekaLyricsDialog(dialog);
    },
    [state]
  );

  return (
    <MusicGeneratorContent
      state={state}
      isMobile={isMobile}
      isGenerating={isGenerating}
      isEnhancing={state.isEnhancing}
      currentModels={[...currentModels]}
      audioSourceDialogOpen={audioSourceDialogOpen}
      personaDialogOpen={personaDialogOpen}
      projectDialogOpen={projectDialogOpen}
      onAudioSourceDialogOpenChange={setAudioSourceDialogOpen}
      onPersonaDialogOpenChange={setPersonaDialogOpen}
      onProjectDialogOpenChange={setProjectDialogOpen}
      onQuickAudioClick={() => setAudioSourceDialogOpen(true)}
      onQuickPersonaClick={() => setPersonaDialogOpen(true)}
      onQuickProjectClick={handleQuickProjectClick}
      onAudioSelect={handleAudioSelect}
      onReferenceTrackSelect={handleReferenceTrackSelect}
      onGenerate={handleGenerate}
      onBoostPrompt={handleBoostPrompt}
      onEnhancedPromptAccept={handleEnhancedPromptAccept}
      onEnhancedPromptReject={handleEnhancedPromptReject}
      audioPreviewUrl={tempAudioUrl}
      audioPreviewFileName={state.pendingAudioFile?.name || ''}
      onAudioPreviewConfirm={audioUpload.handleAudioConfirm}
      onAudioPreviewRemove={audioUpload.handleRemoveAudio}
      onAudioPreviewOpenChange={handleAudioPreviewOpenChange}
      onLyricsGenerated={handleLyricsGenerated}
      onLyricsDialogOpenChange={handleLyricsDialogOpenChange}
      murekaLyricsDialog={state.murekaLyricsDialog}
      onMurekaLyricsDialogChange={handleMurekaLyricsDialogChange}
      onMurekaLyricsSelect={handleMurekaLyricsSelect}
      onHistoryDialogOpenChange={handleHistoryDialogOpenChange}
      onHistorySelect={handleHistorySelect}
      onPersonaSelect={handlePersonaSelect}
      onProjectSelect={handleProjectSelect}
    />
  );
};

export const MusicGeneratorContainer = memo(MusicGeneratorContainerComponent);
