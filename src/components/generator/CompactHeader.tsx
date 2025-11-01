import { memo, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SunoBalanceDisplay } from '@/components/mureka/SunoBalanceDisplay';
import type { GeneratorMode } from './types/generator.types';
import type { ModelVersion } from '@/config/provider-models';

interface CompactHeaderProps {
  mode: GeneratorMode;
  onModeChange: (mode: GeneratorMode) => void;
  modelVersion: string;
  onModelChange: (version: string) => void;
  availableModels: ModelVersion[];
  isGenerating: boolean;
  hasAudio?: boolean;
  hasPersona?: boolean;
}

export const CompactHeader = memo(({
  mode,
  onModeChange,
  modelVersion,
  onModelChange,
  availableModels,
  isGenerating,
  hasAudio = false,
  hasPersona = false,
}: CompactHeaderProps) => {
  const advancedResourcesCount = [hasAudio, hasPersona].filter(Boolean).length;

  const handleModeChange = useCallback((newMode: GeneratorMode) => {
    if (newMode === 'simple' && (hasAudio || hasPersona)) {
      const confirmed = window.confirm(
        'Переключение на Simple Mode скроет Advanced Options (Audio, Persona). Продолжить?'
      );
      if (!confirmed) return;
    }
    onModeChange(newMode);
  }, [hasAudio, hasPersona, onModeChange]);
  return (
    <div 
      className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6 border-b border-border/10 bg-background/95 backdrop-blur-sm px-3 sm:px-4 md:px-6 lg:px-8 py-1.5 sm:py-2"
      style={{ minHeight: 'var(--generator-header-height, 44px)' }}
    >
      {/* Left: Provider Balance - Adaptive */}
      <div className="flex items-center flex-shrink-0">
        <SunoBalanceDisplay />
      </div>

      {/* Center: Mode Tabs - Adaptive */}
      <RadioGroup
        value={mode}
        onValueChange={(v) => handleModeChange(v as GeneratorMode)}
        className="flex items-center gap-0 bg-muted/20 border border-border/30 rounded p-0.5"
      >
        <div className="flex items-center">
          <RadioGroupItem value="simple" id="mode-simple" className="peer sr-only" />
          <Label 
            htmlFor="mode-simple" 
            className="px-2.5 sm:px-3 md:px-4 py-1 text-[10px] sm:text-xs font-medium cursor-pointer rounded-sm transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground peer-data-[state=checked]:shadow-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Simple
          </Label>
        </div>
        <div className="flex items-center gap-1">
          <RadioGroupItem value="custom" id="mode-custom" className="peer sr-only" />
          <Label 
            htmlFor="mode-custom" 
            className="px-2.5 sm:px-3 md:px-4 py-1 text-[10px] sm:text-xs font-medium cursor-pointer rounded-sm transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground peer-data-[state=checked]:shadow-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Custom
          </Label>
          {mode === 'custom' && advancedResourcesCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px] font-medium">
              +{advancedResourcesCount}
            </Badge>
          )}
        </div>
      </RadioGroup>

      {/* Right: Model Select - Adaptive */}
      <div className="flex items-center flex-shrink-0">
        <Select value={modelVersion} onValueChange={onModelChange} disabled={isGenerating}>
          <SelectTrigger className="h-7 w-20 sm:w-24 md:w-28 text-[10px] sm:text-xs border-border/30 bg-muted/20 font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {availableModels.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});

CompactHeader.displayName = 'CompactHeader';
