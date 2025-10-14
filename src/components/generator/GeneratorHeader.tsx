import { memo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileAudio, FileText } from '@/utils/iconImports';
import { ProviderSelector } from '@/components/mureka/ProviderSelector';
import { MurekaBalanceDisplay } from '@/components/mureka/MurekaBalanceDisplay';
import { SunoBalanceDisplay } from '@/components/mureka/SunoBalanceDisplay';
import type { GeneratorMode } from './types/generator.types';
import type { ModelVersion } from '@/config/provider-models';

interface GeneratorHeaderProps {
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
}

export const GeneratorHeader = memo(({
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
}: GeneratorHeaderProps) => {
  return (
    <div className="p-2 sm:p-2.5 border-b border-border/20 space-y-1.5 sm:space-y-2">
      {/* Provider Selector Row with Balance */}
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1.5 xs:gap-2">
        <div className="flex-1">
          <ProviderSelector
            value={selectedProvider}
            onChange={onProviderChange}
            disabled={isGenerating}
          />
        </div>
        <div className="flex items-center justify-end xs:justify-start">
          {selectedProvider === 'mureka' && <MurekaBalanceDisplay />}
          {selectedProvider === 'suno' && <SunoBalanceDisplay />}
        </div>
      </div>

      {/* Mode Tabs + Model Version Row */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as GeneratorMode)} className="flex-1">
          <TabsList className="grid w-full grid-cols-2 h-7 sm:h-8">
            <TabsTrigger value="simple" className="text-[10px] xs:text-xs px-1 sm:px-3">
              Простой
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-[10px] xs:text-xs px-1 sm:px-3">
              Расширенный
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={modelVersion} onValueChange={onModelChange}>
          <SelectTrigger className="h-7 sm:h-8 w-16 xs:w-20 text-[10px] xs:text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-[10px] xs:text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {referenceFileName && (
          <Badge variant="secondary" className="h-5 text-[10px] gap-1 px-2">
            <FileAudio className="h-2.5 w-2.5" />
            Референс
          </Badge>
        )}
        {lyricsLineCount > 0 && (
          <Badge variant="secondary" className="h-5 text-[10px] gap-1 px-2">
            <FileText className="h-2.5 w-2.5" />
            {lyricsLineCount} строк
          </Badge>
        )}
      </div>
    </div>
  );
});

GeneratorHeader.displayName = 'GeneratorHeader';
