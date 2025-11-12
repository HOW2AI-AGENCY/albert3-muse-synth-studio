import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Music, Sparkles, Info, History } from '@/utils/iconImports';
import { StyleRecommendationsInline } from '@/components/generator/StyleRecommendationsInline';
import { PromptCharacterCounter } from '@/components/generator/PromptCharacterCounter';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { GenerationParams } from '../types/generator.types';
import { cn } from '@/lib/utils';

const MAX_PROMPT_LENGTH = 500;

interface SimpleModeCompactProps {
  params: GenerationParams;
  onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  onGenerate: () => void;
  onBoostPrompt?: () => void;
  onOpenHistory?: () => void;
  isBoosting?: boolean;
  isGenerating: boolean;
  debouncedPrompt: string;
  onDebouncedPromptChange: (value: string) => void;
}

export const SimpleModeCompact = memo(({
  params,
  onParamChange,
  onGenerate,
  onBoostPrompt,
  onOpenHistory,
  isBoosting = false,
  isGenerating,
  debouncedPrompt,
  onDebouncedPromptChange,
}: SimpleModeCompactProps) => {
  const handleApplyTags = useCallback((newTags: string[]) => {
    const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    const uniqueTags = Array.from(new Set([...existingTags, ...newTags]));
    onParamChange('tags', uniqueTags.join(', '));
  }, [params.tags, onParamChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto space-y-1.5 sm:space-y-2 pb-20 p-1.5 sm:p-2 md:p-3"> {/* Reduced mobile spacing and padding */}
        {/* Prompt with AI Boost */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
            <Label htmlFor="music-prompt" className="text-sm font-semibold">Описание музыки</Label>
            <InfoTooltip content="Опишите желаемую музыку: жанр, настроение, инструменты. Чем детальнее, тем лучше результат." />
          </div>
          <div className="relative">
            <Textarea
              id="music-prompt"
              data-tour="prompt-input"
              value={debouncedPrompt}
              onChange={(e) => {
                if (e.target.value.length <= MAX_PROMPT_LENGTH) {
                  onDebouncedPromptChange(e.target.value);
                }
              }}
              placeholder="e.g., Спокойный лоу-фай бит с джазовым пианино..."
              className={cn(
                "min-h-[100px] sm:min-h-[120px] resize-none mobile-input pr-10 text-base",
                "focus-visible:ring-2 focus-visible:ring-primary"
              )}
              disabled={isGenerating}
              maxLength={MAX_PROMPT_LENGTH}
              aria-label="Описание музыки"
              aria-describedby="prompt-counter"
            />
            {onBoostPrompt && debouncedPrompt.trim() && (
              <Button
                data-tour="ai-boost"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-11 w-11 sm:h-7 sm:w-7 text-primary hover:text-primary hover:bg-primary/10"
                onClick={onBoostPrompt}
                disabled={isBoosting || isGenerating}
                title="Улучшить промпт с помощью AI"
              >
                <Sparkles className={cn("h-3.5 w-3.5", isBoosting && "animate-spin")} />
              </Button>
            )}
          </div>

          {/* Controls below textarea - FIXED: Moved History button here to match Advanced mode */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <div id="prompt-counter">
                <PromptCharacterCounter
                  currentLength={debouncedPrompt.length}
                  maxLength={MAX_PROMPT_LENGTH}
                />
              </div>
              <InfoTooltip content="Рекомендуем описать стиль, жанр, настроение, темп и инструменты для лучших результатов." />
            </div>
            {onOpenHistory && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenHistory}
                    disabled={isGenerating}
                    className="touch-target-min"
                    aria-label="История промптов"
                  >
                    <History className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">История промптов</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Info Alert if lyrics exist */}
        {params.lyrics.trim() && (
          <Alert className="py-2 bg-primary/5 border-primary/20">
            <Info className="h-3.5 w-3.5 text-primary" />
            <AlertDescription className="text-xs text-muted-foreground ml-1">
              💡 Промпт используется для описания стиля музыки, а текст — для лирики
            </AlertDescription>
          </Alert>
        )}

        {/* AI Style Recommendations */}
        {debouncedPrompt.length >= 10 && (
          <StyleRecommendationsInline
            prompt={debouncedPrompt}
            currentTags={params.tags.split(',').map(t => t.trim()).filter(Boolean)}
            onApplyTags={handleApplyTags}
          />
        )}

        {/* Applied Tags Display */}
        {params.tags && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/50 min-h-[32px]">
            {params.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title Input */}
        <div className="space-y-1.5 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
              Название трека
              <span className="text-[10px] text-muted-foreground/70 ml-1">(опционально)</span>
            </Label>
            <InfoTooltip content="Укажите название трека. Если не заполнить, AI создаст название автоматически." />
          </div>
          <Input
            id="title"
            type="text"
            placeholder="Оставьте пустым для автогенерации"
            value={params.title}
            onChange={(e) => onParamChange('title', e.target.value)}
            className={cn("mobile-input text-sm h-9")}
            disabled={isGenerating}
            maxLength={80}
          />
        </div>
      </div>

      {/* Sticky Footer - ✅ FIX P0.1: z-index above bottom nav and safe-area spacing */}
      <div
        className="sticky bottom-0 left-0 right-0 border-t border-border/20 bg-background/95 backdrop-blur-sm mt-4 safe-area-bottom-lg"
        style={{ zIndex: 'var(--z-mini-player)' }}
      >
        <div className="p-2 sm:p-3 safe-area-bottom">
          <Button
            data-tour="generate-button"
            onClick={onGenerate}
            disabled={isGenerating || (!debouncedPrompt.trim() && !params.lyrics.trim())}
            size="lg"
            className={cn(
              "w-full gap-2 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 touch-target-optimal",
              "min-h-[48px]"
            )}
            aria-label={isGenerating ? 'Генерация музыки в процессе' : 'Создать музыку'}
          >
            <Music className="h-4 w-4" />
            {isGenerating ? 'Генерация музыки...' : 'Создать музыку'}
          </Button>
        </div>
      </div>
    </div>
  );
});

SimpleModeCompact.displayName = 'SimpleModeCompact';