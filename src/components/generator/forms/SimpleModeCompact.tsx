import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Music, Sparkles, Info, History } from '@/utils/iconImports';
import { StyleRecommendationsInline } from '@/components/generator/StyleRecommendationsInline';
import { PromptCharacterCounter } from '@/components/generator/PromptCharacterCounter';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();

  const handleApplyTags = useCallback((newTags: string[]) => {
    const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    const uniqueTags = Array.from(new Set([...existingTags, ...newTags]));
    onParamChange('tags', uniqueTags.join(', '));
  }, [params.tags, onParamChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-20 p-3">
        {/* Prompt with AI Boost */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Описание музыки</Label>
            {onOpenHistory && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={onOpenHistory}
                disabled={isGenerating}
              >
                <History className="h-3.5 w-3.5" />
                История
              </Button>
            )}
          </div>
          <div className="relative">
            <Textarea
              value={debouncedPrompt}
              onChange={(e) => {
                if (e.target.value.length <= MAX_PROMPT_LENGTH) {
                  onDebouncedPromptChange(e.target.value);
                }
              }}
              placeholder="e.g., Upbeat electronic dance music with energetic synths..."
              className={cn(
                "min-h-[100px] resize-none text-sm pr-10",
                "focus-visible:ring-1"
              )}
              disabled={isGenerating}
              maxLength={MAX_PROMPT_LENGTH}
            />
            {onBoostPrompt && debouncedPrompt.trim() && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                onClick={onBoostPrompt}
                disabled={isBoosting || isGenerating}
                title="Улучшить промпт с помощью AI"
              >
                <Sparkles className={cn("h-3.5 w-3.5", isBoosting && "animate-spin")} />
              </Button>
            )}
          </div>
          
          {/* Контролы под формой ввода */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {onBoostPrompt && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={onBoostPrompt}
                  disabled={isBoosting || isGenerating || !debouncedPrompt.trim()}
                  title="Улучшить промпт с помощью AI"
                >
                  <Sparkles className={cn("h-3 w-3", isBoosting && "animate-spin")} />
                  {isBoosting ? 'Улучшение...' : 'AI улучшение'}
                </Button>
              )}
            </div>
            
            <PromptCharacterCounter 
              currentLength={debouncedPrompt.length} 
              maxLength={MAX_PROMPT_LENGTH}
            />
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
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
            Название трека <span className="text-[10px]">(опционально)</span>
          </Label>
          <Input
            id="title"
            type="text"
            placeholder="Оставьте пустым для автогенерации"
            value={params.title}
            onChange={(e) => onParamChange('title', e.target.value)}
            className={cn(isMobile ? "h-10 text-base mobile-no-zoom" : "h-9 text-sm")}
            disabled={isGenerating}
            maxLength={80}
          />
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex-1 text-xs text-muted-foreground">
            Save to: <span className="font-medium">My Workspace</span>
          </div>
          
          <Button
            onClick={onGenerate}
            disabled={isGenerating || (!debouncedPrompt.trim() && !params.lyrics.trim())}
            size="lg"
            className={cn(
              "px-8 gap-2 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20",
              isMobile ? "h-12 text-base" : "h-10 text-sm"
            )}
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