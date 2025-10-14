import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music } from '@/utils/iconImports';
import { GenrePresets } from '@/components/generator/GenrePresets';
import { PromptInput } from './PromptInput';
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

      {/* Title Input */}
      <div className="space-y-1">
        <Label htmlFor="title" className="text-xs font-medium">
          Название трека (опционально)
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="Оставьте пустым для автогенерации"
          value={params.title}
          onChange={(e) => onParamChange('title', e.target.value)}
          className="h-8 text-sm"
          disabled={isGenerating}
          maxLength={80}
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || (!params.prompt.trim() && !params.lyrics.trim())}
        className="w-full h-10 text-sm font-medium gap-2 mt-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Music className="h-4 w-4 animate-spin" />
            Генерация...
          </>
        ) : (
          <>
            <Music className="h-4 w-4" />
            Создать музыку
          </>
        )}
      </Button>
    </>
  );
});

SimpleModeForm.displayName = 'SimpleModeForm';
