import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Music, Info } from '@/utils/iconImports';
import { GenrePresets } from '@/components/generator/GenrePresets';
import { PromptInput } from './PromptInput';
import { StyleRecommendationsInline } from '@/components/generator/StyleRecommendationsInline';
import { PromptCharacterCounter } from '@/components/generator/PromptCharacterCounter';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { GenerationParams, GenrePreset } from '../types/generator.types';

const MAX_PROMPT_LENGTH = 500;

interface SimpleModeFormProps {
  params: GenerationParams;
  onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  onBoostPrompt: () => void;
  onGenerate: (forceNew?: boolean) => void;
  isBoosting: boolean;
  isGenerating: boolean;
  showPresets: boolean;
  onPresetSelect: (preset: GenrePreset) => void;
  debouncedPrompt: string;
  onDebouncedPromptChange: (value: string) => void;
}

export const SimpleModeForm = memo(({
  params,
  onParamChange,
  onBoostPrompt,
  onGenerate,
  isBoosting,
  isGenerating,
  showPresets,
  onPresetSelect,
  debouncedPrompt,
  onDebouncedPromptChange,
}: SimpleModeFormProps) => {
  const isMobile = useIsMobile();
  
  const handleGenerate = useCallback((e: React.MouseEvent<HTMLButtonElement> | React.FormEvent) => {
    e.preventDefault();
    const native = (e as any).nativeEvent || e;
    const force = !!(native && (native.altKey || native.metaKey));
    onGenerate(force);
  }, [onGenerate]);

  const handleApplyTags = useCallback((newTags: string[]) => {
    const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    const uniqueTags = Array.from(new Set([...existingTags, ...newTags]));
    onParamChange('tags', uniqueTags.join(', '));
  }, [params.tags, onParamChange]);

  return (
    <>
      {/* Genre Presets */}
      {showPresets && params.prompt.length === 0 && (
        <GenrePresets onSelect={onPresetSelect} />
      )}

      {/* Song Description with Boost */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Описание музыки</Label>
          <PromptCharacterCounter 
            currentLength={debouncedPrompt.length} 
            maxLength={MAX_PROMPT_LENGTH}
          />
        </div>
        <PromptInput
          value={debouncedPrompt}
          onChange={(value) => {
            // ✅ Truncate at 500 characters
            if (value.length <= MAX_PROMPT_LENGTH) {
              onDebouncedPromptChange(value);
            }
          }}
          onBoost={onBoostPrompt}
          isBoosting={isBoosting}
          isGenerating={isGenerating}
          isRequired
          hasLyrics={!!params.lyrics.trim()}
          customMode={false}
          maxLength={MAX_PROMPT_LENGTH}
        />
      </div>

      {/* ✅ NEW: Подсказка при наличии лирики */}
      {params.lyrics.trim() && (
        <Alert className="py-2 bg-primary/5 border-primary/20">
          <Info className="h-3.5 w-3.5 text-primary" />
          <AlertDescription className="text-xs text-muted-foreground ml-1">
            💡 Промпт используется для описания стиля музыки, а текст — для лирики. Текст будет петься.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Recommendations */}
      {params.prompt.length >= 10 && (
        <StyleRecommendationsInline
          prompt={params.prompt}
          currentTags={params.tags.split(',').map(t => t.trim()).filter(Boolean)}
          onApplyTags={handleApplyTags}
        />
      )}

      {/* Applied Tags Display */}
      {params.tags && (
        <div className="space-y-1.5">
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
        </div>
      )}

      {/* Compact Title Input */}
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
          className={cn(
            isMobile ? "h-10 text-base mobile-no-zoom" : "h-9 text-sm"
          )}
          disabled={isGenerating}
          maxLength={80}
        />
      </div>

      {/* Compact Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || (!params.prompt.trim() && !params.lyrics.trim())}
        className={cn(
          "w-full font-semibold gap-2.5 mt-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20",
          isMobile ? "h-12 text-base" : "h-11 text-sm"
        )}
        size="lg"
      >
        {isGenerating ? (
          <>
            <Music className="h-4 w-4 animate-spin" />
            <span>Генерация музыки...</span>
          </>
        ) : (
          <>
            <Music className="h-4 w-4" />
            <span>Создать музыку</span>
          </>
        )}
      </Button>
    </>
  );
});

SimpleModeForm.displayName = 'SimpleModeForm';
