import { memo, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, User, ChevronDown, Music, Sparkles, Plus, History } from '@/utils/iconImports';
import { LyricsInput } from '@/components/lyrics/legacy/LyricsInput';
import { StyleTagsInput } from './StyleTagsInput';
import { StyleRecommendationsInline } from '@/components/generator/StyleRecommendationsInline';
import { PromptCharacterCounter } from '@/components/generator/PromptCharacterCounter';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { GenerationParams } from '../types/generator.types';
import { VOCAL_GENDER_OPTIONS } from '../types/generator.types';
import type { AdvancedPromptResult } from '@/services/ai/advanced-prompt-generator';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProjectSelectorDialog } from '@/components/generator/ProjectSelectorDialog';
import { ProjectDraftsSelector } from '@/components/generator/ProjectDraftsSelector';
import { useState, useCallback } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useTracks } from '@/hooks/useTracks';

const AudioDescriber = lazy(() => import('@/components/audio/AudioDescriber').then(m => ({ default: m.AudioDescriber })));

const MAX_PROMPT_LENGTH = 500;

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
}: CompactCustomFormProps) => {
  const { projects } = useProjects();
  const isMobile = useIsMobile();
  const lyricsLineCount = debouncedLyrics.split('\n').filter(l => l.trim()).length;
  const tagsCount = params.tags.split(',').filter(t => t.trim()).length;
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  const { tracks: allTracks } = useTracks();

  const handleTrackSelect = useCallback((trackId: string) => {
    const track = allTracks.find(t => t.id === trackId);
    if (!track) return;

    // Auto-fill track title from project planned track
    onParamChange('title', track.title);
    
    // Auto-fill prompt from track's prompt field (style description)
    if (track.prompt) {
      onParamChange('prompt', track.prompt);
      onDebouncedPromptChange(track.prompt);
    }
    
    // Optionally copy style tags
    if (track.style_tags && track.style_tags.length > 0) {
      const currentTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
      const uniqueTags = Array.from(new Set([...currentTags, ...track.style_tags]));
      onParamChange('tags', uniqueTags.join(', '));
    }
    
    logger.info('Track selected from project - autofilled title and prompt', 'CompactCustomForm', { 
      trackId, 
      trackTitle: track.title,
      hasPrompt: !!track.prompt 
    });
  }, [allTracks, params.tags, onParamChange, onDebouncedPromptChange]);

  const handleQuickTagAdd = useCallback((tag: string) => {
    const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (!existingTags.includes(tag)) {
      const newTags = [...existingTags, tag].join(', ');
      onParamChange('tags', newTags);
      logger.info('Quick tag added', 'CompactCustomForm', { tag });
    }
  }, [params.tags, onParamChange]);

  const handleApplyTags = useCallback((newTags: string[]) => {
    const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    const uniqueTags = Array.from(new Set([...existingTags, ...newTags]));
    onParamChange('tags', uniqueTags.join(', '));
  }, [params.tags, onParamChange]);

  const handleAdvancedPromptGenerated = useCallback((result: AdvancedPromptResult) => {
    logger.info('Advanced prompt applied to form', 'CompactCustomForm', {
      promptLength: result.enhancedPrompt.length,
      lyricsLength: result.formattedLyrics.length,
      metaTagsCount: result.metaTags.length,
    });

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
      const uniqueTags = Array.from(new Set([...existingTags, ...newStyleTags]));
      onParamChange('tags', uniqueTags.join(', '));
    }
  }, [params.tags, onParamChange, onDebouncedPromptChange, onDebouncedLyricsChange]);

  return (
    <div className="flex flex-col h-full pb-safe">
      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-20">
        {/* Title - Moved to top */}
        <div className="space-y-1 p-2">
          <Label htmlFor="custom-title" className="text-xs font-medium">
            Название
          </Label>
          <Input
            id="custom-title"
            type="text"
            placeholder="Авто-генерация если пусто"
            value={params.title}
            onChange={(e) => onParamChange('title', e.target.value)}
            className={cn("mobile-input", isMobile ? "h-11" : "h-8")}
            disabled={isGenerating}
            maxLength={80}
          />
        </div>

        {/* Prompt with AI Boost & History */}
        <div className="space-y-1.5 p-2">
          <div className="flex items-center justify-between">
            <PromptCharacterCounter 
              currentLength={debouncedPrompt.length} 
              maxLength={MAX_PROMPT_LENGTH}
            />
            {onOpenHistory && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenHistory}
                    disabled={isGenerating}
                    className="h-6 w-6"
                  >
                    <History className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">История промптов</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="relative">
            <Textarea
              id="custom-prompt"
              placeholder="Опишите стиль, жанр, настроение..."
              value={debouncedPrompt}
              onChange={(e) => {
                if (e.target.value.length <= MAX_PROMPT_LENGTH) {
                  onDebouncedPromptChange(e.target.value);
                }
              }}
              disabled={isGenerating}
              className={cn(
                "pr-10 resize-y min-h-[80px] max-h-[300px] mobile-input"
              )}
              maxLength={MAX_PROMPT_LENGTH}
              aria-label="Описание стиля музыки"
            />
            {onBoostPrompt && debouncedPrompt.trim() && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-2 h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={onBoostPrompt}
                    disabled={isBoosting || isGenerating}
                  >
                    <Sparkles className={cn("h-3.5 w-3.5", isBoosting && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">Улучшить промпт с помощью AI</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Project Selector Button */}
        <div className="p-2">
          <Button
            variant="outline"
            onClick={() => setProjectDialogOpen(true)}
            className={cn("w-full justify-start gap-2 text-sm", isMobile ? "h-11" : "h-9")}
            disabled={isGenerating}
          >
            <Music className="h-4 w-4" />
            {params.activeProjectId 
              ? `Проект: ${projects.find(p => p.id === params.activeProjectId)?.name || 'Выбран'}`
              : 'Выбрать проект'}
          </Button>
        </div>

        {/* Project Drafts Selector - показываем черновики выбранного проекта */}
        <div className="p-2">
          <ProjectDraftsSelector
            projectId={params.activeProjectId || null}
            projectName={projects.find(p => p.id === params.activeProjectId)?.name}
            onDraftSelect={handleTrackSelect}
            selectedDraftId={params.referenceTrackId || null}
            disabled={isGenerating}
          />
        </div>

        {/* Project Selector Dialog */}
        <ProjectSelectorDialog
          open={projectDialogOpen}
          onOpenChange={setProjectDialogOpen}
          selectedProjectId={params.activeProjectId || null}
          onProjectSelect={(projectId) => {
            onParamChange('activeProjectId', projectId);
            logger.info('Project selected for generation', 'CompactCustomForm', { projectId });
          }}
          showTrackSelection={false}
        />

        {/* Selected Resources Info */}
        {(params.referenceFileName || params.personaId || params.inspoProjectName) && (
          <div className="p-2 space-y-1 border border-accent/40 rounded-lg bg-accent/5">
            {params.referenceFileName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Upload className="h-3 w-3" />
                <span className="flex-1 truncate">Audio: {params.referenceFileName}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 hover:text-destructive" 
                  onClick={() => {
                    onParamChange('referenceAudioUrl', null);
                    onParamChange('referenceFileName', null);
                    onParamChange('referenceTrackId', null);
                  }}
                >
                  ×
                </Button>
              </div>
            )}
            {params.personaId && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="flex-1">Persona: Active</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 hover:text-destructive" 
                  onClick={() => onParamChange('personaId', null)}
                >
                  ×
                </Button>
              </div>
            )}
            {params.inspoProjectName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span className="flex-1 truncate">Inspo: {params.inspoProjectName}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 hover:text-destructive" 
                  onClick={() => {
                    onParamChange('inspoProjectId', null);
                    onParamChange('inspoProjectName', null);
                  }}
                >
                  ×
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Lyrics Section */}
        <Collapsible defaultOpen={!!debouncedLyrics}>
          <CollapsibleTrigger className={cn(
            "flex items-center justify-between w-full hover:bg-accent/5 rounded-md transition-colors group",
            isMobile ? "p-3" : "p-2"
          )}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              <span>Lyrics</span>
              {lyricsLineCount > 0 && (
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                  {lyricsLineCount} lines
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLyricsDialog();
              }}
              className={cn(
                "h-6 px-2 text-[10px] gap-1 transition-opacity",
                isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <Sparkles className="h-3 w-3" />
              Generate
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <LyricsInput
              value={debouncedLyrics}
              onChange={onDebouncedLyricsChange}
              onGenerateLyrics={onOpenLyricsDialog}
              isGenerating={isGenerating}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Styles Section with AI Recommendations */}
        <Collapsible defaultOpen={tagsCount > 0}>
          <CollapsibleTrigger className={cn(
            "flex items-center justify-between w-full hover:bg-accent/5 rounded-md transition-colors group",
            isMobile ? "p-3" : "p-2"
          )}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              <span>Styles</span>
              {tagsCount > 0 && (
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                  {tagsCount}
                </Badge>
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {/* AI Recommendations */}
            {debouncedPrompt.length >= 10 && (
              <StyleRecommendationsInline
                prompt={debouncedPrompt}
                currentTags={params.tags.split(',').map(t => t.trim()).filter(Boolean)}
                lyrics={params.lyrics}
                onApplyTags={handleApplyTags}
                onAdvancedPromptGenerated={handleAdvancedPromptGenerated}
              />
            )}

            <StyleTagsInput
              tags={params.tags}
              negativeTags={params.negativeTags}
              onTagsChange={(tags) => onParamChange('tags', tags)}
              onNegativeTagsChange={(tags) => onParamChange('negativeTags', tags)}
              isGenerating={isGenerating}
            />
            
            {/* Quick Style Pills */}
            <div className="flex flex-wrap gap-1.5">
              {['creepy', 'ambient', 'acid techno', 'synthwave', 'lofi'].map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTagAdd(tag)}
                  className="h-6 px-2 text-[10px] gap-1"
                  disabled={isGenerating}
                >
                  <Plus className="h-3 w-3" />
                  {tag}
                </Button>
              ))}
            </div>

            {/* AudioDescriber if reference exists */}
            {params.referenceAudioUrl && (
              <Suspense fallback={<div className="text-xs text-muted-foreground">Загрузка анализатора...</div>}>
                <AudioDescriber 
                  audioUrl={params.referenceAudioUrl} 
                  onDescriptionGenerated={(description) => onParamChange('prompt', description)}
                />
              </Suspense>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Advanced Options */}
        <Collapsible>
          <CollapsibleTrigger className={cn(
            "flex items-center gap-2 w-full hover:bg-accent/5 rounded-md transition-colors group",
            isMobile ? "p-3" : "p-2"
          )}>
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            <span className="text-sm font-medium">Advanced Options</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3 p-2">
            {/* Advanced Controls with InfoTooltips */}
            <div className="space-y-4">
              {/* Audio Weight - с Info Tooltip */}
              {params.referenceFileName && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1.5">
                      Влияние референса
                      <InfoTooltip 
                        content={
                          <div className="space-y-1">
                            <p className="font-semibold">Audio Weight (0-100%)</p>
                            <p className="text-xs">Определяет, насколько сильно сгенерированный трек будет похож на референсное аудио.</p>
                            <ul className="text-xs list-disc list-inside mt-2 space-y-0.5">
                              <li><strong>0-30%:</strong> Лёгкое влияние стиля</li>
                              <li><strong>30-70%:</strong> Сбалансированное влияние</li>
                              <li><strong>70-100%:</strong> Максимальное копирование</li>
                            </ul>
                          </div>
                        }
                      />
                    </Label>
                    <span className="text-xs text-muted-foreground">{params.audioWeight}%</span>
                  </div>
                  <Slider
                    value={[params.audioWeight]}
                    onValueChange={([v]: number[]) => onParamChange('audioWeight', v)}
                    min={0}
                    max={100}
                    step={5}
                    className="touch-target-optimal"
                    disabled={isGenerating}
                  />
                </div>
              )}

              {/* Style Weight - с Info Tooltip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    Влияние стиля
                    <InfoTooltip 
                      content={
                        <div className="space-y-1">
                          <p className="font-semibold">Style Weight (0-100%)</p>
                          <p className="text-xs">Контролирует, насколько AI следует указанным тегам стиля.</p>
                          <ul className="text-xs list-disc list-inside mt-2 space-y-0.5">
                            <li><strong>0-30%:</strong> Свободная интерпретация</li>
                            <li><strong>30-70%:</strong> Умеренное следование стилю</li>
                            <li><strong>70-100%:</strong> Строгое следование тегам</li>
                          </ul>
                          <p className="text-xs mt-2 text-muted-foreground">💡 Рекомендуется: 60-80% для баланса</p>
                        </div>
                      }
                    />
                  </Label>
                  <span className="text-xs text-muted-foreground">{params.styleWeight}%</span>
                </div>
                <Slider
                  value={[params.styleWeight]}
                  onValueChange={([v]: number[]) => onParamChange('styleWeight', v)}
                  min={0}
                  max={100}
                  step={5}
                  disabled={isGenerating}
                />
              </div>

              {/* Weirdness Constraint - с Info Tooltip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    Креативность
                    <InfoTooltip 
                      content={
                        <div className="space-y-1">
                          <p className="font-semibold">Weirdness Constraint</p>
                          <p className="text-xs">Уровень экспериментальности в генерации.</p>
                          <ul className="text-xs list-disc list-inside mt-2 space-y-0.5">
                            <li><strong>0-20%:</strong> Традиционное звучание</li>
                            <li><strong>20-50%:</strong> Умеренные эксперименты</li>
                            <li><strong>50-100%:</strong> Авангардный стиль</li>
                          </ul>
                          <p className="text-xs mt-2 text-muted-foreground">⚠️ Высокие значения могут дать неожиданные результаты</p>
                        </div>
                      }
                    />
                  </Label>
                  <span className="text-xs text-muted-foreground">{params.weirdnessConstraint}%</span>
                </div>
                <Slider
                  value={[params.weirdnessConstraint]}
                  onValueChange={([v]: number[]) => onParamChange('weirdnessConstraint', v)}
                  min={0}
                  max={100}
                  step={5}
                  disabled={isGenerating}
                />
              </div>

              {/* Vocal Gender - только для Suno */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Тип вокала</Label>
                <ToggleGroup 
                  type="single"
                  value={params.vocalGender} 
                  onValueChange={(v: string) => v && onParamChange('vocalGender', v as any)}
                  disabled={isGenerating}
                  className="justify-start gap-1.5"
                >
                  {VOCAL_GENDER_OPTIONS.map((option) => (
                    <ToggleGroupItem 
                      key={option.value} 
                      value={option.value} 
                      className="h-8 px-3 text-xs data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:border-primary/50"
                      disabled={isGenerating}
                    >
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="p-3 flex items-center gap-2">
          {/* Create Button */}
          <Button
            onClick={onGenerate}
            disabled={isGenerating || (!debouncedPrompt.trim() && !debouncedLyrics.trim())}
            size="lg"
            className={cn(
              "w-full gap-2 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
              isMobile ? "h-12 text-base" : "h-10 text-sm"
            )}
          >
            <Music className="h-4 w-4" />
            {isGenerating ? 'Генерация музыки...' : 'Создать музыку'}
          </Button>
        </div>
      </div>

      {/* Project Selector Dialog */}
      <ProjectSelectorDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        selectedProjectId={params.activeProjectId || null}
        onProjectSelect={(projectId) => onParamChange('activeProjectId', projectId || null)}
        onTrackSelect={handleTrackSelect}
        showTrackSelection={true}
      />
    </div>
  );
});

CompactCustomForm.displayName = 'CompactCustomForm';