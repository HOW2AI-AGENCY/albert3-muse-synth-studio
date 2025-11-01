import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Music, Sparkles } from '@/utils/iconImports';
import type { GenerationParams } from '../types/generator.types';
import { cn } from '@/lib/utils';

interface SimpleModeCompactProps {
  params: GenerationParams;
  onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  debouncedPrompt: string;
  onDebouncedPromptChange: (value: string) => void;
}

const QUICK_PRESETS = [
  { label: 'Electronic', tags: 'electronic, edm, energetic' },
  { label: 'Chill', tags: 'chill, lofi, ambient, relaxing' },
  { label: 'Rock', tags: 'rock, guitar, energetic' },
  { label: 'Jazz', tags: 'jazz, smooth, instrumental' },
  { label: 'Classical', tags: 'classical, orchestral, elegant' },
];

export const SimpleModeCompact = memo(({
  onParamChange,
  onGenerate,
  isGenerating,
  debouncedPrompt,
  onDebouncedPromptChange,
}: SimpleModeCompactProps) => {
  const handlePresetClick = (preset: typeof QUICK_PRESETS[0]) => {
    onParamChange('tags', preset.tags);
    onDebouncedPromptChange(`${preset.label} music`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-20 p-3">
        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Describe your music</label>
          <Textarea
            value={debouncedPrompt}
            onChange={(e) => onDebouncedPromptChange(e.target.value)}
            placeholder="e.g., Upbeat electronic dance music with energetic synths..."
            className={cn(
              "min-h-[100px] resize-none text-sm",
              "focus-visible:ring-1"
            )}
            disabled={isGenerating}
            maxLength={500}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{debouncedPrompt.length}/500</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {/* TODO: AI enhance */}}
              className="h-6 px-2 gap-1"
              disabled={isGenerating || !debouncedPrompt.trim()}
            >
              <Sparkles className="h-3 w-3" />
              Enhance
            </Button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Quick Presets</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset)}
                className="h-8 text-xs"
                disabled={isGenerating}
              >
                {preset.label}
              </Button>
            ))}
          </div>
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
            disabled={isGenerating || !debouncedPrompt.trim()}
            size="lg"
            className="h-10 px-8 gap-2 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Music className="h-4 w-4" />
            {isGenerating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
});

SimpleModeCompact.displayName = 'SimpleModeCompact';
