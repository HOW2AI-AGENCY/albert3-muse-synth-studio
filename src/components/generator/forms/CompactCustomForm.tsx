import { memo, useMemo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Music } from '@/utils/iconImports';
import { FormTitle } from './sections/FormTitle';
import { FormPrompt } from './sections/FormPrompt';
import { FormLyrics } from './sections/FormLyrics';
import { FormStyles } from './sections/FormStyles';
import { FormAdvanced } from './sections/FormAdvanced';
import { ProjectTrackPickerDialog } from '@/components/generator/ProjectTrackPickerDialog';
import { useProjects } from '@/contexts/project/useProjects';
import { useTracks } from '@/hooks/useTracks';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import type { GenerationParams } from '../types/generator.types';
import type { AdvancedPromptResult } from '@/services/ai/advanced-prompt-generator';
import type { Track } from '@/types/domain/track.types';

interface CompactCustomFormProps {
  params: GenerationParams;
  onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  onGenerate: () => void;
  onOpenLyricsDialog: () => void;
  onOpenHistory?: () => void;
  onBoostPrompt?: () => void;
  isBoosting?: boolean;
  isGenerating: boolean;
  debouncedPrompt: string;
  debouncedLyrics: string;
  onDebouncedPromptChange: (value: string) => void;
  onDebouncedLyricsChange: (value: string) => void;
  onModeChange?: (mode: 'simple' | 'custom') => void;
  isMobile: boolean;
}

export const CompactCustomForm = memo(({
  params,
  onParamChange,
  onGenerate,
  onOpenLyricsDialog,
  onOpenHistory,
  onBoostPrompt,
  isBoosting = false,
  isGenerating,
  debouncedPrompt,
  debouncedLyrics,
  onDebouncedPromptChange,
  onDebouncedLyricsChange,
  isMobile
}: CompactCustomFormProps) => {
  const { projects } = useProjects();
  const { tracks: allTracks } = useTracks();
  const { toast } = useToast();
  const [trackPickerOpen, setTrackPickerOpen] = useState(false);

  const lyricsLineCount = useMemo(() => debouncedLyrics.split('\n').filter(l => l.trim()).length, [debouncedLyrics]);
  const tagsCount = useMemo(() => params.tags.split(',').filter(t => t.trim()).length, [params.tags]);
  const promptError = useMemo(() => debouncedPrompt.length > 3000, [debouncedPrompt]);

  const selectedProject = useMemo(() => projects.find(p => p.id === params.activeProjectId), [projects, params.activeProjectId]);

  const handleTrackSelect = useCallback((track: Track) => {
    logger.info('Track selected from project - autofilling form', 'CompactCustomForm', { trackId: track.id });
    onParamChange('title', track.title);
    if (track.prompt) {
      onParamChange('prompt', track.prompt);
      onDebouncedPromptChange(track.prompt);
    }
    if (track.lyrics) {
      onParamChange('lyrics', track.lyrics);
      onDebouncedLyricsChange(track.lyrics);
    }
    if (track.style_tags?.length) {
      const currentTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
      const uniqueTags = Array.from(new Set([...currentTags, ...track.style_tags]));
      onParamChange('tags', uniqueTags.join(', '));
    }
    if (selectedProject?.persona_id) {
      onParamChange('personaId', selectedProject.persona_id);
    }
    onParamChange('referenceTrackId', track.id);
    toast({ title: "Трек загружен", description: `"${track.title}" загружен в форму генерации` });
    setTrackPickerOpen(false);
  }, [params.tags, selectedProject, onParamChange, onDebouncedPromptChange, onDebouncedLyricsChange, toast]);

  const handleQuickTagAdd = useCallback((tag: string) => {
    const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (!existingTags.includes(tag)) {
      onParamChange('tags', [...existingTags, tag].join(', '));
    }
  }, [params.tags, onParamChange]);

  const handleApplyTags = useCallback((newTags: string[]) => {
    const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    onParamChange('tags', Array.from(new Set([...existingTags, ...newTags])).join(', '));
  }, [params.tags, onParamChange]);

  const handleAdvancedPromptGenerated = useCallback((result: AdvancedPromptResult) => {
    onParamChange('prompt', result.enhancedPrompt);
    onDebouncedPromptChange(result.enhancedPrompt);
    if (result.formattedLyrics.trim()) {
      onParamChange('lyrics', result.formattedLyrics);
      onDebouncedLyricsChange(result.formattedLyrics);
    }
    const styleMeta = result.metaTags.find(t => t.toLowerCase().includes('style'));
    if (styleMeta) {
      const styleValue = styleMeta.replace(/^style:\s*/i, '').trim();
      const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
      const newStyleTags = styleValue.split(',').map(t => t.trim()).filter(Boolean);
      onParamChange('tags', Array.from(new Set([...existingTags, ...newStyleTags])).join(', '));
    }
  }, [params.tags, onParamChange, onDebouncedPromptChange, onDebouncedLyricsChange]);

  return (
    <div className="flex flex-col h-full pb-safe">
      <div className="flex-1 overflow-y-auto space-y-2 pb-20">
        <FormTitle params={params} onParamChange={onParamChange} isGenerating={isGenerating} isMobile={isMobile} />
        <FormPrompt
          debouncedPrompt={debouncedPrompt}
          onDebouncedPromptChange={onDebouncedPromptChange}
          onBoostPrompt={onBoostPrompt}
          onOpenHistory={onOpenHistory}
          isBoosting={isBoosting}
          isGenerating={isGenerating}
          promptError={promptError}
        />
        <FormLyrics
          debouncedLyrics={debouncedLyrics}
          onDebouncedLyricsChange={onDebouncedLyricsChange}
          onOpenLyricsDialog={onOpenLyricsDialog}
          isGenerating={isGenerating}
          lyricsLineCount={lyricsLineCount}
          isMobile={isMobile}
        />
        <FormStyles
          params={params}
          onParamChange={onParamChange}
          isGenerating={isGenerating}
          tagsCount={tagsCount}
          debouncedPrompt={debouncedPrompt}
          handleQuickTagAdd={handleQuickTagAdd}
          handleApplyTags={handleApplyTags}
          handleAdvancedPromptGenerated={handleAdvancedPromptGenerated}
          isMobile={isMobile}
        />
        <FormAdvanced
            params={params}
            onParamChange={onParamChange}
            isGenerating={isGenerating}
            isMobile={isMobile}
        />
        <ProjectTrackPickerDialog
          open={trackPickerOpen}
          onOpenChange={setTrackPickerOpen}
          projectId={params.activeProjectId || ''}
          onTrackSelect={handleTrackSelect}
          selectedTrackId={params.referenceTrackId || null}
        />
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 border-t border-border/20 bg-background/95 backdrop-blur-sm safe-area-bottom-lg"
        style={{ zIndex: 'var(--z-control-buttons)' }}
      >
        <div className="p-2 sm:p-3 flex items-center gap-2 safe-area-bottom">
          <Button
            onClick={onGenerate}
            disabled={isGenerating || (!debouncedPrompt.trim() && !debouncedLyrics.trim()) || promptError}
            size="lg"
            className={cn(
              "w-full gap-2 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
              isMobile ? "h-12 text-base" : "h-10 text-sm"
            )}
          >
            <Music className="h-4 w-4" />
            {isGenerating ? 'Генерация...' : 'Создать'}
          </Button>
        </div>
      </div>
    </div>
  );
});

CompactCustomForm.displayName = 'CompactCustomForm';
