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
      className="flex items-center justify-between border-b border-border/20 bg-background/95 backdrop-blur-sm px-4 sm:px-6"
      style={{ minHeight: 'var(--generator-header-height, 52px)' }}
    >
      {/* Left: Provider & Model */}
      <div className="flex items-center gap-3">
        <Select 
          value={selectedProvider} 
          onValueChange={onProviderChange} 
          disabled={isGenerating}
        >
          <SelectTrigger className="h-8 w-28 text-xs border-border/40 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background">
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

        <Select value={modelVersion} onValueChange={onModelChange}>
          <SelectTrigger className="h-8 w-20 text-xs border-border/40 bg-background/50">
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

      {/* Center: Mode Tabs */}
      <RadioGroup
        value={mode}
        onValueChange={(v) => onModeChange(v as GeneratorMode)}
        className="flex items-center gap-1 bg-muted/30 rounded-lg p-1"
      >
        <div className="flex items-center">
          <RadioGroupItem value="simple" id="mode-simple" className="peer sr-only" />
          <Label 
            htmlFor="mode-simple" 
            className="px-4 py-1.5 text-xs font-medium cursor-pointer rounded-md transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
          >
            Simple
          </Label>
        </div>
        <div className="flex items-center">
          <RadioGroupItem value="custom" id="mode-custom" className="peer sr-only" />
          <Label 
            htmlFor="mode-custom" 
            className="px-4 py-1.5 text-xs font-medium cursor-pointer rounded-md transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
          >
            Custom
          </Label>
        </div>
      </RadioGroup>

      {/* Right: Balance & Info */}
      <div className="flex items-center gap-3">
        {(referenceFileName || lyricsLineCount > 0) && (
          <div className="flex items-center gap-1.5">
            {referenceFileName && (
              <Badge variant="secondary" className="h-6 text-[10px] gap-1 px-2 bg-secondary/50">
                <FileAudio className="h-3 w-3" />
                <span className="hidden sm:inline">Ref</span>
              </Badge>
            )}
            {lyricsLineCount > 0 && (
              <Badge variant="secondary" className="h-6 text-[10px] gap-1 px-2 bg-secondary/50">
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">{lyricsLineCount}</span>
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {selectedProvider === 'mureka' && <MurekaBalanceDisplay />}
          {selectedProvider === 'suno' && <SunoBalanceDisplay />}
          
          {rateLimitRemaining !== undefined && rateLimitMax && rateLimitRemaining <= 2 && (
            <Badge 
              variant={rateLimitRemaining < 3 ? "destructive" : "outline"} 
              className="h-6 text-[10px] px-2"
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
