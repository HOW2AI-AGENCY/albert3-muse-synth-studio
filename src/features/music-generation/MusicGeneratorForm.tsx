import { useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleModeCompact } from '@/components/generator/forms/SimpleModeCompact';
import { CompactCustomForm } from '@/components/generator/forms/CompactCustomForm';
import { EnhancedPromptPreview } from '@/components/generator/EnhancedPromptPreview';
import { useGeneratorState } from '@/components/generator/hooks';
import { useGenerateMusic } from '@/hooks/useGenerateMusic';
import { useToast } from '@/hooks/use-toast';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { logger } from '@/utils/logger';
import { type MusicProvider as ProviderType } from '@/config/provider-models';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { cn } from '@/lib/utils';

interface MusicGeneratorFormProps {
    onTrackGenerated?: () => void;
}

export const MusicGeneratorForm = ({ onTrackGenerated }: MusicGeneratorFormProps) => {
    const { selectedProvider } = useMusicGenerationStore();
    const state = useGeneratorState(selectedProvider);
    const { toast } = useToast();
    const { vibrate } = useHapticFeedback();
    const { savePrompt } = usePromptHistory();
    const { isMobile } = useBreakpoints();
    const { generate, isGenerating } = useGenerateMusic({
        provider: selectedProvider as ProviderType,
        onSuccess: onTrackGenerated,
        toast
    });

    const handleGenerate = useCallback(async () => {
        vibrate('heavy');

        // Validation
        const hasPrompt = state.params.prompt.trim().length > 0;
        const hasLyrics = state.params.lyrics.trim().length > 0;
        const hasReferenceAudio = !!state.params.referenceAudioUrl;

        if (!hasPrompt && !hasLyrics) {
          toast({
            title: 'Заполните промпт или текст песни',
            description: 'Хотя бы одно поле должно быть заполнено',
            variant: 'destructive'
          });
          return;
        }

        if (hasReferenceAudio && !hasPrompt && !hasLyrics) {
          toast({
            title: 'Добавьте описание',
            description: 'Референсное аудио лучше работает с промптом или текстом',
            variant: 'destructive'
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
        const vocalGenderParam = (hasVocals && state.params.vocalGender !== 'any')
          ? state.params.vocalGender.substring(0, 1) as 'f' | 'm'
          : undefined;

        const effectiveLyrics = hasVocals && state.params.lyrics.trim() ? state.params.lyrics.trim() : undefined;
        const hasLyricsContent = !!effectiveLyrics;

        const requestParams = {
          prompt: state.params.prompt.trim(),
          title: state.params.title.trim() || undefined,
          lyrics: effectiveLyrics,
          hasVocals,
          styleTags: state.params.tags.split(',').map(t => t.trim()).filter(Boolean),
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

        // Save to history
        try {
          await savePrompt({
            prompt: state.params.prompt,
            lyrics: state.params.lyrics || undefined,
            style_tags: state.params.tags ? state.params.tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
            provider: selectedProvider as 'suno' | 'mureka',
          });
        } catch (error) {
          logger.error('[MusicGeneratorV2] Failed to save prompt:', error instanceof Error ? error : undefined);
        }

        logger.info('🎵 [GENERATE] Starting generation',
          `Prompt: ${!!state.params.prompt.trim()}, Lyrics: ${!!state.params.lyrics.trim()}, Audio: ${!!state.params.referenceAudioUrl}, Mode: ${state.mode}`
        );

        const started = await generate(requestParams);
        if (started) {
          state.setParams(prev => ({
            ...prev,
            title: '',
            prompt: '',
            lyrics: '',
            tags: '',
          }));
          state.setDebouncedPrompt('');
          state.setDebouncedLyrics('');
        }
      }, [state, generate, toast, vibrate, selectedProvider, savePrompt]);

      // Prompt boost handler
      const handleBoostPrompt = useCallback(async () => {
        if (!state.params.prompt.trim()) return;

        state.setIsEnhancing(true);

        try {
          const { data, error } = await supabase.functions.invoke('improve-prompt', {
            body: {
              prompt: state.params.prompt,
              provider: selectedProvider
            }
          });

          if (error) throw error;

          if (data?.enhancedPrompt) {
            state.setParam('prompt', data.enhancedPrompt);
            state.setDebouncedPrompt(data.enhancedPrompt);

            sonnerToast.success('Промпт улучшен!', {
              description: 'AI применил рекомендации',
              duration: 2000
            });
          }
        } catch (error) {
          logger.error('Failed to boost prompt', error as Error);
          toast({
            variant: 'destructive',
            title: 'Ошибка улучшения',
            description: 'Не удалось улучшить промпт. Попробуйте позже.'
          });
        } finally {
          state.setIsEnhancing(false);
        }
      }, [state, selectedProvider, toast]);

      // Enhanced prompt handlers
      const handleEnhancedPromptAccept = useCallback((finalPrompt: string) => {
        state.setParam('prompt', finalPrompt);
        state.setDebouncedPrompt(finalPrompt);
        state.setEnhancedPrompt(null);
        setTimeout(() => handleGenerate(), 100);
      }, [state, handleGenerate]);

      const handleEnhancedPromptReject = useCallback(() => {
        state.setEnhancedPrompt(null);
        setTimeout(() => handleGenerate(), 100);
      }, [state, handleGenerate]);

    return (
        <ScrollArea className={cn(
            "flex-grow",
            isMobile && "max-h-[var(--generator-max-height-mobile)]"
          )}>
            <div
              className="space-y-2"
              style={{
                padding: isMobile ? 'var(--spacing-card-padding)' : 'var(--space-2_5, 0.625rem)'
              }}
            >
              {/* Enhanced Prompt Preview */}
              {state.enhancedPrompt && (
                <div className="px-1">
                  <EnhancedPromptPreview
                    original={state.params.prompt}
                    enhanced={state.enhancedPrompt.enhanced}
                    addedElements={state.enhancedPrompt.addedElements}
                    reasoning={state.enhancedPrompt.reasoning}
                    onAccept={handleEnhancedPromptAccept}
                    onReject={handleEnhancedPromptReject}
                    isLoading={isGenerating}
                  />
                </div>
              )}

              {state.mode === 'simple' ? (
                <SimpleModeCompact
                  params={state.params}
                  onParamChange={state.setParam}
                  onGenerate={handleGenerate}
                  onBoostPrompt={handleBoostPrompt}
                  onOpenHistory={() => state.setHistoryDialogOpen(true)}
                  isBoosting={state.isEnhancing}
                  isGenerating={isGenerating || state.isEnhancing}
                  debouncedPrompt={state.debouncedPrompt}
                  onDebouncedPromptChange={state.setDebouncedPrompt}
                />
              ) : (
                <CompactCustomForm
                  params={state.params}
                  onParamChange={state.setParam}
                  onGenerate={handleGenerate}
                  onOpenLyricsDialog={() => state.setLyricsDialogOpen(true)}
                  onOpenHistory={() => state.setHistoryDialogOpen(true)}
                  onBoostPrompt={handleBoostPrompt}
                  isBoosting={state.isEnhancing}
                  isGenerating={isGenerating || state.isEnhancing}
                  debouncedPrompt={state.debouncedPrompt}
                  debouncedLyrics={state.debouncedLyrics}
                  onDebouncedPromptChange={state.setDebouncedPrompt}
                  onDebouncedLyricsChange={state.setDebouncedLyrics}
                  onModeChange={state.setMode}
                />
              )}
            </div>
          </ScrollArea>
    );
};
