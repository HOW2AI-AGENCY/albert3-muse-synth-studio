import { memo, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useGenerateMusic } from '@/hooks/useGenerateMusic';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { AudioPreviewDialog } from '@/components/audio/AudioPreviewDialog';
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog';
import { MurekaLyricsVariantDialog } from '@/components/lyrics/MurekaLyricsVariantDialog';
import { PromptHistoryDialog } from '@/components/generator/PromptHistoryDialog';
import { PersonaPickerDialog } from '@/components/generator/PersonaPickerDialog';
import { EnhancedPromptPreview } from '@/components/generator/EnhancedPromptPreview';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { getProviderModels, getDefaultModel, type MusicProvider as ProviderType } from '@/config/provider-models';

// Auto-enhancement removed per user request

// Modular components & hooks
import { CompactHeader } from '@/components/generator/CompactHeader';
import { QuickActionsBar } from '@/components/generator/QuickActionsBar';
import { InspoProjectDialog } from '@/components/generator/InspoProjectDialog';
import { AudioSourceDialog } from '@/components/generator/audio/AudioSourceDialog';
import { SimpleModeCompact } from '@/components/generator/forms/SimpleModeCompact';
import { CompactCustomForm } from '@/components/generator/forms/CompactCustomForm';
import { 
  useGeneratorState,
  useStemReferenceLoader,
  usePendingGenerationLoader,
  useAudioUploadHandler,
} from '@/components/generator/hooks';

interface MusicGeneratorV2Props {
  onTrackGenerated?: () => void;
}

const MusicGeneratorV2Component = ({ onTrackGenerated }: MusicGeneratorV2Props) => {
  const { selectedProvider, setProvider } = useMusicGenerationStore();
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  
  const { generate, isGenerating } = useGenerateMusic({ 
    provider: selectedProvider as ProviderType, 
    onSuccess: onTrackGenerated,
    toast 
  });
  
  const currentModels = getProviderModels(selectedProvider as ProviderType);
  const { savePrompt } = usePromptHistory();

  // Provider change handler with correct typing
  const handleProviderChange = useCallback((provider: string) => {
    setProvider(provider as ProviderType);
  }, [setProvider]);

  // ✅ REFACTORED: Consolidated state management
  const state = useGeneratorState(selectedProvider);
  
  // Dialog states
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [inspoDialogOpen, setInspoDialogOpen] = useState(false);
  const [audioSourceDialogOpen, setAudioSourceDialogOpen] = useState(false);
  
  // ✅ REFACTORED: Auto-loaders
  useStemReferenceLoader(state, selectedProvider, handleProviderChange);
  usePendingGenerationLoader(state);
  
  // ✅ REFACTORED: Audio handling
  const audioUpload = useAudioUploadHandler(state);

  // Debounce effects
  useEffect(() => {
    const timer = setTimeout(() => state.setParam('prompt', state.debouncedPrompt), 300);
    return () => clearTimeout(timer);
  }, [state.debouncedPrompt, state.setParam]);

  useEffect(() => {
    const timer = setTimeout(() => state.setParam('lyrics', state.debouncedLyrics), 300);
    return () => clearTimeout(timer);
  }, [state.debouncedLyrics, state.setParam]);

  // ✅ Subscribe to track updates for Mureka lyrics selection
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

  // Sync provider with model version
  useEffect(() => {
    const defaultModel = getDefaultModel(selectedProvider as ProviderType);
    state.setParams(prev => {
      const newParams = { 
        ...prev, 
        provider: selectedProvider,
        modelVersion: defaultModel.value
      };
      
      // Clear referenceAudioUrl if switched to Mureka
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

  // Handle Mureka lyrics variant selection
  const handleMurekaLyricsSelect = useCallback(async (lyrics: string, variantId: string) => {
    if (!state.murekaLyricsDialog.trackId) return;
    
    try {
      logger.info('User selected Mureka lyrics variant', undefined, {
        trackId: state.murekaLyricsDialog.trackId,
        variantId
      });
      
      const { error } = await supabase
        .from('tracks')
        .update({
          lyrics: lyrics,
          metadata: {
            selected_lyrics_variant_id: variantId,
            stage: 'composing_music',
            stage_description: 'Создание музыки...'
          }
        })
        .eq('id', state.murekaLyricsDialog.trackId);
      
      if (error) throw error;
      
      sonnerToast.success('Текст выбран! Продолжаем создание музыки...', {
        duration: 3000
      });
      
      state.setParam('lyrics', lyrics);
      
    } catch (error) {
      logger.error('Failed to apply lyrics variant', error as Error);
      sonnerToast.error('Ошибка применения текста');
    }
  }, [state.murekaLyricsDialog.trackId, state.setParam]);

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
      projectId: state.params.activeProjectId || undefined, // ✅ НОВОЕ: передаём project_id
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

  // Inspo project selection handler
  const handleSelectInspo = useCallback((projectId: string, projectName: string) => {
    state.setParam('inspoProjectId', projectId);
    state.setParam('inspoProjectName', projectName);
    
    logger.info('Inspiration project applied', 'MusicGeneratorV2', {
      projectId,
      projectName,
    });
    
    sonnerToast.success('✨ Проект применён', {
      description: `Используем стиль и концепцию "${projectName}"`,
      duration: 3000,
    });
    
    setInspoDialogOpen(false);
  }, [state]);

  // Auto-switch to Custom Mode when advanced features are used
  useEffect(() => {
    const hasAdvancedFeatures = 
      !!state.params.referenceAudioUrl || 
      !!state.params.personaId;
    
    if (hasAdvancedFeatures && state.mode === 'simple') {
      logger.info('Auto-switching to Custom Mode (advanced features detected)', 'MusicGeneratorV2');
      state.setMode('custom');
      
      toast({
        title: 'Переключено на Custom Mode',
        description: 'Для Audio/Persona требуется Custom Mode',
        duration: 3000,
      });
    }
  }, [
    state.params.referenceAudioUrl, 
    state.params.personaId, 
    state.mode, 
    state.setMode, 
    toast
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating) {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, isGenerating]);

  const tempAudioUrl = state.pendingAudioFile ? URL.createObjectURL(state.pendingAudioFile) : '';
  const isMobile = useIsMobile();

  return (
    <motion.div 
      className={cn(
        "flex flex-col h-full card-elevated",
        isMobile && "rounded-none"
      )}
      data-testid="music-generator"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Compact Header */}
      <CompactHeader
        mode={state.mode}
        onModeChange={state.setMode}
        modelVersion={state.params.modelVersion}
        onModelChange={(version) => state.setParam('modelVersion', version)}
        availableModels={[...currentModels]}
        isGenerating={isGenerating}
        hasAudio={!!state.params.referenceFileName}
        hasPersona={!!state.params.personaId}
      />

      {/* Quick Actions Bar */}
        <QuickActionsBar
          hasAudio={!!state.params.referenceFileName}
          hasPersona={!!state.params.personaId}
          hasInspo={!!state.params.inspoProjectId}
          onAudioClick={() => setAudioSourceDialogOpen(true)}
          onPersonaClick={() => setPersonaDialogOpen(true)}
          onInspoClick={() => setInspoDialogOpen(true)}
          isGenerating={isGenerating}
        />

      {/* Audio Source Dialog */}
      <AudioSourceDialog
        open={audioSourceDialogOpen}
        onOpenChange={setAudioSourceDialogOpen}
        onAudioSelect={(url: string, fileName: string) => {
          state.setParam('referenceAudioUrl', url);
          state.setParam('referenceFileName', fileName);
        }}
        onRecordComplete={() => {
          // Optional: handle recording completion
        }}
        onTrackSelect={(track: any) => {
          // Optional: handle track selection metadata
          if (track.style_tags?.length > 0) {
            const existingTags = state.params.tags || '';
            const newTags = existingTags 
              ? `${existingTags}, ${track.style_tags.join(', ')}`
              : track.style_tags.join(', ');
            state.setParam('tags', newTags);
          }
        }}
      />

      {/* Main Content */}
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
            />
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <AudioPreviewDialog
        open={state.audioPreviewOpen}
        onOpenChange={(open) => {
          state.setAudioPreviewOpen(open);
          if (!open) state.setPendingAudioFile(null);
        }}
        onConfirm={audioUpload.handleAudioConfirm}
        onRemove={audioUpload.handleRemoveAudio}
        audioUrl={tempAudioUrl}
        fileName={state.pendingAudioFile?.name || ''}
      />

      <LyricsGeneratorDialog
        open={state.lyricsDialogOpen}
        onOpenChange={state.setLyricsDialogOpen}
        trackId={state.params.trackId}
        onGenerated={(lyrics: string) => {
          state.setParam('lyrics', lyrics);
          state.setDebouncedLyrics(lyrics);
          state.setLyricsDialogOpen(false);
        }}
      />

      <MurekaLyricsVariantDialog
        open={state.murekaLyricsDialog.open}
        onOpenChange={(open) => state.setMurekaLyricsDialog({ ...state.murekaLyricsDialog, open })}
        trackId={state.murekaLyricsDialog.trackId}
        jobId={state.murekaLyricsDialog.jobId}
        onSelectVariant={handleMurekaLyricsSelect}
      />

      <PromptHistoryDialog
        open={state.historyDialogOpen}
        onOpenChange={state.setHistoryDialogOpen}
        onSelect={(historyItem: {
          prompt: string;
          lyrics?: string;
          style_tags?: string[];
        }) => {
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
        }}
      />

      <InspoProjectDialog
        open={inspoDialogOpen}
        onOpenChange={setInspoDialogOpen}
        selectedProjectId={state.params.inspoProjectId ?? null}
        onSelectProject={handleSelectInspo}
      />

      <PersonaPickerDialog
        open={personaDialogOpen}
        onOpenChange={setPersonaDialogOpen}
        selectedPersonaId={state.params.personaId ?? null}
        onSelectPersona={(personaId) => {
          state.setParam('personaId', personaId);
          setPersonaDialogOpen(false);
          if (personaId) {
            toast({
              title: "Персона выбрана",
              description: "Музыкальная персона будет применена к генерации",
            });
          }
        }}
      />
    </motion.div>
  );
};

export const MusicGeneratorV2 = memo(MusicGeneratorV2Component);
