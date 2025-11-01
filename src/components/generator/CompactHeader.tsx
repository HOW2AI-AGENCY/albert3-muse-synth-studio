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
      className="flex flex-col border-b border-border/20 bg-background/95 backdrop-blur-sm transition-all duration-200"
      style={{ 
        height: 'auto',
        minHeight: 'var(--generator-header-height, 52px)'
      }}
    >
      {/* Adaptive Multi-row Layout */}
      <div className="flex flex-wrap items-center gap-2 px-2 sm:px-3 py-2 md:py-1.5">
        {/* Row 1 (mobile) / Inline (desktop): Provider + Mode */}
        <div className="flex items-center gap-2 flex-1 min-w-[160px] sm:min-w-[200px]">
          {/* Provider Selector */}
          <Select 
            value={selectedProvider} 
            onValueChange={onProviderChange} 
            disabled={isGenerating}
          >
            <SelectTrigger className="h-7 flex-1 sm:flex-initial sm:w-24 text-[10px] sm:text-xs border-border/40 bg-background">
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

          {/* Mode Toggle */}
          <RadioGroup
            value={mode}
            onValueChange={(v) => onModeChange(v as GeneratorMode)}
            className="flex items-center gap-1.5 flex-1 sm:flex-initial"
          >
            <div className="flex items-center gap-1 flex-1 sm:flex-initial">
              <RadioGroupItem value="simple" id="mode-simple" className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <Label 
                htmlFor="mode-simple" 
                className="text-[10px] sm:text-xs font-medium cursor-pointer leading-none whitespace-nowrap"
              >
                <span className="hidden sm:inline">Простой</span>
                <span className="sm:hidden">Пр</span>
              </Label>
            </div>
            <div className="flex items-center gap-1 flex-1 sm:flex-initial">
              <RadioGroupItem value="custom" id="mode-custom" className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <Label 
                htmlFor="mode-custom" 
                className="text-[10px] sm:text-xs font-medium cursor-pointer leading-none whitespace-nowrap"
              >
                <span className="hidden sm:inline">Расширенный</span>
                <span className="sm:hidden">Рс</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Row 2 (mobile) / Inline (desktop): Model + Balance + Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto sm:flex-1 sm:justify-end">
          {/* Model Selector */}
          <Select value={modelVersion} onValueChange={onModelChange}>
            <SelectTrigger className="h-7 w-16 sm:w-16 text-[9px] sm:text-[10px] border-border/40 bg-background flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {availableModels.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-[10px]">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Balance - adaptive */}
          <div className="flex items-center flex-1 sm:flex-initial justify-end">
            {selectedProvider === 'mureka' && <MurekaBalanceDisplay />}
            {selectedProvider === 'suno' && <SunoBalanceDisplay />}
          </div>

          {/* Status Badges - desktop only */}
          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
            {referenceFileName && (
              <Badge variant="secondary" className="h-5 text-[9px] gap-0.5 px-1.5 bg-secondary/50">
                <FileAudio className="h-2.5 w-2.5" />
                Ref
              </Badge>
            )}
            {lyricsLineCount > 0 && (
              <Badge variant="secondary" className="h-5 text-[9px] gap-0.5 px-1.5 bg-secondary/50">
                <FileText className="h-2.5 w-2.5" />
                {lyricsLineCount}
              </Badge>
            )}
          </div>

          {/* Rate Limit - always visible if critical */}
          {rateLimitRemaining !== undefined && rateLimitMax && rateLimitRemaining <= 2 && (
            <Badge 
              variant={rateLimitRemaining < 3 ? "destructive" : "outline"} 
              className="h-5 text-[9px] px-1.5 flex-shrink-0"
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
