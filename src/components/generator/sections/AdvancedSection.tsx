/**
 * Advanced Section Component
 * Handles advanced generation parameters
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { GeneratorSection } from './GeneratorSection';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AdvancedSectionProps {
  modelVersion: string;
  onModelChange: (model: string) => void;
  vocalGender: string;
  onVocalGenderChange: (gender: string) => void;
  instrumental: boolean;
  onInstrumentalChange: (instrumental: boolean) => void;
  audioWeight?: number;
  onAudioWeightChange?: (weight: number) => void;
  styleWeight?: number;
  onStyleWeightChange?: (weight: number) => void;
  disabled?: boolean;
  className?: string;
  availableModels?: Array<{ value: string; label: string; badge?: string }>;
}

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  modelVersion,
  onModelChange,
  vocalGender,
  onVocalGenderChange,
  instrumental,
  onInstrumentalChange,
  audioWeight,
  onAudioWeightChange,
  styleWeight,
  onStyleWeightChange,
  disabled = false,
  className,
  availableModels = [],
}) => {
  return (
    <GeneratorSection
      title="Расширенные настройки"
      description="Тонкая настройка генерации"
      className={className}
    >
      <div className="space-y-5">
        {/* Model Selection */}
        {availableModels.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="model">Модель генерации</Label>
            <Select value={modelVersion} onValueChange={onModelChange} disabled={disabled}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex items-center gap-2">
                      <span>{model.label}</span>
                      {model.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {model.badge}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Instrumental Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="instrumental">Инструментальная версия</Label>
            <p className="text-xs text-muted-foreground">Без вокала</p>
          </div>
          <Switch
            id="instrumental"
            checked={instrumental}
            onCheckedChange={onInstrumentalChange}
            disabled={disabled}
          />
        </div>

        {/* Vocal Gender */}
        {!instrumental && (
          <div className="space-y-2">
            <Label htmlFor="vocal-gender">Тип вокала</Label>
            <Select value={vocalGender} onValueChange={onVocalGenderChange} disabled={disabled}>
              <SelectTrigger id="vocal-gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Любой</SelectItem>
                <SelectItem value="male">Мужской</SelectItem>
                <SelectItem value="female">Женский</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Style Weight */}
        {styleWeight !== undefined && onStyleWeightChange && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Влияние стиля</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Насколько строго следовать заданным стилям</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-2">
              <Slider
                value={[styleWeight]}
                onValueChange={([value]) => onStyleWeightChange(value)}
                min={0}
                max={100}
                step={5}
                disabled={disabled}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Свободно</span>
                <span>{styleWeight}%</span>
                <span>Строго</span>
              </div>
            </div>
          </div>
        )}

        {/* Audio Weight */}
        {audioWeight !== undefined && onAudioWeightChange && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Влияние референса</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Насколько сильно ориентироваться на референсное аудио</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-2">
              <Slider
                value={[audioWeight]}
                onValueChange={([value]) => onAudioWeightChange(value)}
                min={0}
                max={100}
                step={5}
                disabled={disabled}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Слабо</span>
                <span>{audioWeight}%</span>
                <span>Сильно</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </GeneratorSection>
  );
};
