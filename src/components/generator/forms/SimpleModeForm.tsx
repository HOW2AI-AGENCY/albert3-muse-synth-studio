import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music } from '@/utils/iconImports';
import { GenrePresets } from '@/components/generator/GenrePresets';
import { PromptInput } from './PromptInput';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { GenerationParams, GenrePreset } from '../types/generator.types';

interface SimpleModeFormProps {
  params: GenerationParams;
  onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  onBoostPrompt: () => void;
  onGenerate: () => void;
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
  
  const handleGenerate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onGenerate();
  }, [onGenerate]);

  return (
    <>
      {/* Genre Presets */}
      {showPresets && params.prompt.length === 0 && (
        <GenrePresets onSelect={onPresetSelect} />
      )}

      {/* Song Description with Boost */}
      <PromptInput
        value={debouncedPrompt}
        onChange={onDebouncedPromptChange}
        onBoost={onBoostPrompt}
        isBoosting={isBoosting}
        isGenerating={isGenerating}
        isRequired
        hasLyrics={!!params.lyrics.trim()}
      />

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
            "text-sm",
            isMobile ? "h-10 text-base" : "h-9"
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
