import { memo } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CompactHeader } from '@/components/generator/CompactHeader';
import { QuickActionsBar } from '@/components/generator/QuickActionsBar';
import { AudioSourceDialog } from '@/components/generator/audio/AudioSourceDialog';
import { SimpleModeCompact } from '@/components/generator/forms/SimpleModeCompact';
import { CompactCustomForm } from '@/components/generator/forms/CompactCustomForm';
import { AudioPreviewDialog } from '@/components/audio/AudioPreviewDialog';
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog';
import { PromptHistoryDialog } from '@/components/generator/PromptHistoryDialog';
import { PersonaPickerDialog } from '@/components/generator/PersonaPickerDialog';
import { ProjectSelectorDialog } from '@/components/generator/ProjectSelectorDialog';
import { GeneratorTour } from '@/components/onboarding/GeneratorTour';
import { EnhancedPromptPreview } from '@/components/generator/EnhancedPromptPreview';
import { cn } from '@/lib/utils';
import type { ModelVersion } from '@/config/provider-models';
import type { UseGeneratorStateReturn } from '@/components/generator/hooks';

type PromptHistoryItem = {
  prompt: string;
  lyrics?: string;
  style_tags?: string[];
};

type MusicGeneratorContentProps = {
  state: UseGeneratorStateReturn;
  isMobile: boolean;
  isGenerating: boolean;
  isEnhancing: boolean;
  currentModels: ModelVersion[];
  audioSourceDialogOpen: boolean;
  personaDialogOpen: boolean;
  projectDialogOpen: boolean;
  onAudioSourceDialogOpenChange: (open: boolean) => void;
  onPersonaDialogOpenChange: (open: boolean) => void;
  onProjectDialogOpenChange: (open: boolean) => void;
  onQuickAudioClick: () => void;
  onQuickPersonaClick: () => void;
  onQuickProjectClick: () => void;
  onAudioSelect: (url: string, fileName: string) => void;
  onReferenceTrackSelect: (track: any) => void;
  onGenerate: () => Promise<void>;
  onBoostPrompt: () => Promise<void>;
  onEnhancedPromptAccept: (finalPrompt: string) => void;
  onEnhancedPromptReject: () => void;
  audioPreviewUrl: string;
  audioPreviewFileName: string;
  onAudioPreviewConfirm: () => void;
  onAudioPreviewRemove: () => void;
  onAudioPreviewOpenChange: (open: boolean) => void;
  onLyricsGenerated: (lyrics: string) => void;
  onLyricsDialogOpenChange: (open: boolean) => void;
  onHistoryDialogOpenChange: (open: boolean) => void;
  onHistorySelect: (item: PromptHistoryItem) => void;
  onPersonaSelect: (personaId: string | null) => void;
  onProjectSelect: (projectId: string | null) => void;
  onProjectTrackSelect: (track: { id: string; title: string; prompt?: string; lyrics?: string; style_tags?: string[] }) => void;
};

export const MusicGeneratorContent = memo(({
  state,
  isMobile,
  isGenerating,
  isEnhancing,
  currentModels,
  audioSourceDialogOpen,
  personaDialogOpen,
  projectDialogOpen,
  onAudioSourceDialogOpenChange,
  onPersonaDialogOpenChange,
  onProjectDialogOpenChange,
  onQuickAudioClick,
  onQuickPersonaClick,
  onQuickProjectClick,
  onAudioSelect,
  onReferenceTrackSelect,
  onGenerate,
  onBoostPrompt,
  onEnhancedPromptAccept,
  onEnhancedPromptReject,
  audioPreviewUrl,
  audioPreviewFileName,
  onAudioPreviewConfirm,
  onAudioPreviewRemove,
  onAudioPreviewOpenChange,
  onLyricsGenerated,
  onLyricsDialogOpenChange,
  onHistoryDialogOpenChange,
  onHistorySelect,
  onPersonaSelect,
  onProjectSelect,
  onProjectTrackSelect,
}: MusicGeneratorContentProps) => {
  return (
    <motion.div
      className={cn('flex flex-col h-full card-elevated', isMobile && 'rounded-none')}
      data-testid="music-generator"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
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

      <QuickActionsBar
        hasAudio={!!state.params.referenceFileName}
        hasPersona={!!state.params.personaId}
        hasProject={!!state.params.activeProjectId}
        onAudioClick={onQuickAudioClick}
        onPersonaClick={onQuickPersonaClick}
        onProjectClick={onQuickProjectClick}
        isGenerating={isGenerating}
      />

      <AudioSourceDialog
        open={audioSourceDialogOpen}
        onOpenChange={onAudioSourceDialogOpenChange}
        onAudioSelect={onAudioSelect}
        onRecordComplete={() => {}}
        onTrackSelect={onReferenceTrackSelect}
      />

      <ScrollArea
        className={cn('flex-grow', isMobile && 'max-h-[var(--generator-max-height-mobile)]')}
      >
        <div
          className="space-y-2"
          style={{
            padding: isMobile ? 'var(--spacing-card-padding)' : 'var(--space-2_5, 0.625rem)',
          }}
        >
          {state.enhancedPrompt && (
            <div className="px-1">
              <EnhancedPromptPreviewWrapper
                state={state}
                isGenerating={isGenerating}
                onAccept={onEnhancedPromptAccept}
                onReject={onEnhancedPromptReject}
              />
            </div>
          )}

          {state.mode === 'simple' ? (
            <SimpleModeCompact
              params={state.params}
              onParamChange={state.setParam}
              onGenerate={onGenerate}
              onBoostPrompt={onBoostPrompt}
              onOpenHistory={() => onHistoryDialogOpenChange(true)}
              isBoosting={isEnhancing}
              isGenerating={isGenerating || isEnhancing}
              debouncedPrompt={state.debouncedPrompt}
              onDebouncedPromptChange={state.setDebouncedPrompt}
            />
          ) : (
            <CompactCustomForm
              params={state.params}
              onParamChange={state.setParam}
              onGenerate={onGenerate}
              onOpenLyricsDialog={() => onLyricsDialogOpenChange(true)}
              onOpenHistory={() => onHistoryDialogOpenChange(true)}
              onBoostPrompt={onBoostPrompt}
              isBoosting={isEnhancing}
              isGenerating={isGenerating || isEnhancing}
              debouncedPrompt={state.debouncedPrompt}
              debouncedLyrics={state.debouncedLyrics}
              onDebouncedPromptChange={state.setDebouncedPrompt}
              onDebouncedLyricsChange={state.setDebouncedLyrics}
              onModeChange={state.setMode}
              isMobile={isMobile}
            />
          )}
        </div>
      </ScrollArea>

      <AudioPreviewDialog
        open={state.audioPreviewOpen}
        onOpenChange={onAudioPreviewOpenChange}
        onConfirm={onAudioPreviewConfirm}
        onRemove={onAudioPreviewRemove}
        audioUrl={audioPreviewUrl}
        fileName={audioPreviewFileName}
      />

      <LyricsGeneratorDialog
        open={state.lyricsDialogOpen}
        onOpenChange={onLyricsDialogOpenChange}
        trackId={state.params.trackId}
        onGenerated={onLyricsGenerated}
      />

      {/* Mureka removed - only Suno supported */}

      <PromptHistoryDialog
        open={state.historyDialogOpen}
        onOpenChange={onHistoryDialogOpenChange}
        onSelect={onHistorySelect}
      />

      <PersonaPickerDialog
        open={personaDialogOpen}
        onOpenChange={onPersonaDialogOpenChange}
        selectedPersonaId={state.params.personaId ?? null}
        onSelectPersona={onPersonaSelect}
      />

      <ProjectSelectorDialog
        open={projectDialogOpen}
        onOpenChange={onProjectDialogOpenChange}
        selectedProjectId={state.params.activeProjectId ?? null}
        onProjectSelect={onProjectSelect}
        onTrackSelect={onProjectTrackSelect}
        showTrackSelection={true}
      />

      <GeneratorTour />
    </motion.div>
  );
});

MusicGeneratorContent.displayName = 'MusicGeneratorContent';

const EnhancedPromptPreviewWrapper = ({
  state,
  isGenerating,
  onAccept,
  onReject,
}: {
  state: UseGeneratorStateReturn;
  isGenerating: boolean;
  onAccept: (prompt: string) => void;
  onReject: () => void;
}) => {
  if (!state.enhancedPrompt) return null;

  return (
    <EnhancedPromptPreview
      original={state.params.prompt}
      enhanced={state.enhancedPrompt.enhanced}
      addedElements={state.enhancedPrompt.addedElements}
      reasoning={state.enhancedPrompt.reasoning}
      onAccept={onAccept}
      onReject={onReject}
      isLoading={isGenerating}
    />
  );
};

export default MusicGeneratorContent;
