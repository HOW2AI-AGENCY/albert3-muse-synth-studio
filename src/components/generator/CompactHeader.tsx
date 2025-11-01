import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileAudio, FileText } from '@/utils/iconImports';
import { MurekaBalanceDisplay } from '@/components/mureka/MurekaBalanceDisplay';
import { SunoBalanceDisplay } from '@/components/mureka/SunoBalanceDisplay';
import type { GeneratorMode } from './types/generator.types';
import type { ModelVersion } from '@/config/provider-models';
import { PROVIDERS } from '@/services/providers/registry';
import type { MusicProvider } from '@/config/provider-models';

interface CompactHeaderProps {
  selectedProvider: 'suno' | 'mureka';
  onProviderChange: (provider: string) => void;
  mode: GeneratorMode;
  onModeChange: (mode: GeneratorMode) => void;
  modelVersion: string;
  onModelChange: (version: string) => void;
  availableModels: ModelVersion[];
  isGenerating: boolean;
  referenceFileName: string | null;
  lyricsLineCount: number;
  rateLimitRemaining?: number;
  rateLimitMax?: number;
}

export const CompactHeader = memo(({
  selectedProvider,
  onProviderChange,
  mode,
  onModeChange,
  modelVersion,
  onModelChange,
  availableModels,
  isGenerating,
  referenceFileName,
  lyricsLineCount,
  rateLimitRemaining,
  rateLimitMax,
}: CompactHeaderProps) => {
  return (
    <div 
      className="flex flex-col border-b border-border/20 bg-background/95 backdrop-blur-sm"
      style={{ height: 'var(--generator-header-height, 52px)' }}
    >
      {/* Main Row: Provider + Mode + Model + Balance */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 flex-1">
        {/* Left: Provider + Mode Toggle */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Provider Selector - Compact Inline */}
          <Select 
            value={selectedProvider} 
            onValueChange={onProviderChange} 
            disabled={isGenerating}
          >
            <SelectTrigger className="h-7 w-24 text-xs border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROVIDERS) as MusicProvider[]).map((provider) => {
                const config = PROVIDERS[provider];
                return (
                  <SelectItem key={provider} value={provider} className="text-xs">
                    {config.displayName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Mode Toggle - Radio Style */}
          <RadioGroup
            value={mode}
            onValueChange={(v) => onModeChange(v as GeneratorMode)}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="simple" id="mode-simple" className="h-3.5 w-3.5" />
              <Label 
                htmlFor="mode-simple" 
                className="text-xs font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Простой
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="custom" id="mode-custom" className="h-3.5 w-3.5" />
              <Label 
                htmlFor="mode-custom" 
                className="text-xs font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Расширенный
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Right: Model + Balance + Status Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Model Selector - Ultra Compact */}
          <Select value={modelVersion} onValueChange={onModelChange}>
            <SelectTrigger className="h-7 w-16 text-[10px] border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-[10px]">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Balance Display */}
          <div className="hidden sm:flex items-center">
            {selectedProvider === 'mureka' && <MurekaBalanceDisplay />}
            {selectedProvider === 'suno' && <SunoBalanceDisplay />}
          </div>

          {/* Status Badges - Inline */}
          {referenceFileName && (
            <Badge variant="secondary" className="h-5 text-[9px] gap-0.5 px-1.5 hidden md:flex">
              <FileAudio className="h-2.5 w-2.5" />
              Ref
            </Badge>
          )}
          {lyricsLineCount > 0 && (
            <Badge variant="secondary" className="h-5 text-[9px] gap-0.5 px-1.5 hidden md:flex">
              <FileText className="h-2.5 w-2.5" />
              {lyricsLineCount}
            </Badge>
          )}
          {rateLimitRemaining !== undefined && rateLimitMax && rateLimitRemaining <= 2 && (
            <Badge 
              variant={rateLimitRemaining < 3 ? "destructive" : "outline"} 
              className="h-5 text-[9px] px-1.5"
            >
              {rateLimitRemaining}/{rateLimitMax}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

CompactHeader.displayName = 'CompactHeader';
