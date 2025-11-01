import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MurekaBalanceDisplay } from '@/components/mureka/MurekaBalanceDisplay';
import { SunoBalanceDisplay } from '@/components/mureka/SunoBalanceDisplay';
import type { GeneratorMode } from './types/generator.types';
import type { ModelVersion } from '@/config/provider-models';

interface CompactHeaderProps {
  selectedProvider: 'suno' | 'mureka';
  mode: GeneratorMode;
  onModeChange: (mode: GeneratorMode) => void;
  modelVersion: string;
  onModelChange: (version: string) => void;
  availableModels: ModelVersion[];
  isGenerating: boolean;
}

export const CompactHeader = memo(({
  selectedProvider,
  mode,
  onModeChange,
  modelVersion,
  onModelChange,
  availableModels,
  isGenerating,
}: CompactHeaderProps) => {
  return (
    <div 
      className="flex items-center justify-between border-b border-border/20 bg-background/95 backdrop-blur-sm px-6"
      style={{ minHeight: 'var(--generator-header-height, 56px)' }}
    >
      {/* Left: Provider Balance */}
      <div className="flex items-center min-w-[140px]">
        {selectedProvider === 'mureka' && <MurekaBalanceDisplay />}
        {selectedProvider === 'suno' && <SunoBalanceDisplay />}
      </div>

      {/* Center: Mode Tabs */}
      <RadioGroup
        value={mode}
        onValueChange={(v) => onModeChange(v as GeneratorMode)}
        className="flex items-center gap-0 bg-background/50 border border-border/40 rounded-lg p-0.5"
      >
        <div className="flex items-center">
          <RadioGroupItem value="simple" id="mode-simple" className="peer sr-only" />
          <Label 
            htmlFor="mode-simple" 
            className="px-6 py-2 text-sm font-medium cursor-pointer rounded-md transition-all peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary peer-data-[state=checked]:shadow-sm"
          >
            Simple
          </Label>
        </div>
        <div className="flex items-center">
          <RadioGroupItem value="custom" id="mode-custom" className="peer sr-only" />
          <Label 
            htmlFor="mode-custom" 
            className="px-6 py-2 text-sm font-medium cursor-pointer rounded-md transition-all peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary peer-data-[state=checked]:shadow-sm"
          >
            Custom
          </Label>
        </div>
      </RadioGroup>

      {/* Right: Model Select */}
      <div className="flex items-center min-w-[140px] justify-end">
        <Select value={modelVersion} onValueChange={onModelChange} disabled={isGenerating}>
          <SelectTrigger className="h-9 w-32 text-sm border-border/40 bg-background/50 font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {availableModels.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-sm">
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
