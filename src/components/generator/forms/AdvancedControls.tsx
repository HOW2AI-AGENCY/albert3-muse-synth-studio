import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { VOCAL_GENDER_OPTIONS, type VocalGender } from '../types/generator.types';

interface AdvancedControlsProps {
  vocalGender: VocalGender;
  audioWeight: number;
  styleWeight: number;
  lyricsWeight: number;
  weirdness: number;
  hasReferenceAudio: boolean;
  hasLyrics: boolean;
  onVocalGenderChange: (value: VocalGender) => void;
  onAudioWeightChange: (value: number) => void;
  onStyleWeightChange: (value: number) => void;
  onLyricsWeightChange: (value: number) => void;
  onWeirdnessChange: (value: number) => void;
  isGenerating: boolean;
}

export const AdvancedControls = memo(({
  vocalGender,
  audioWeight,
  styleWeight,
  lyricsWeight,
  weirdness,
  hasReferenceAudio,
  hasLyrics,
  onVocalGenderChange,
  onAudioWeightChange,
  onStyleWeightChange,
  onLyricsWeightChange,
  onWeirdnessChange,
  isGenerating,
}: AdvancedControlsProps) => {
  return (
    <div className="space-y-4">
      {/* Vocal Gender */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Тип вокала</Label>
        <Select 
          value={vocalGender} 
          onValueChange={(v) => onVocalGenderChange(v as VocalGender)}
          disabled={isGenerating}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOCAL_GENDER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-sm">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Audio Weight */}
      {hasReferenceAudio && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Влияние референса</Label>
            <span className="text-xs font-mono text-muted-foreground">{audioWeight}%</span>
          </div>
          <Slider
            value={[audioWeight]}
            onValueChange={([value]) => onAudioWeightChange(value)}
            min={0}
            max={100}
            step={5}
            disabled={isGenerating}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Слабое</span>
            <span>Умеренное</span>
            <span>Сильное</span>
          </div>
        </div>
      )}

      {/* Style Weight */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Сила стиля</Label>
          <span className="text-xs text-muted-foreground">{styleWeight}%</span>
        </div>
        <Slider
          value={[styleWeight]}
          onValueChange={([value]) => onStyleWeightChange(value)}
          min={0}
          max={100}
          step={5}
          disabled={isGenerating}
          className="w-full"
        />
      </div>

      {/* Lyrics Weight */}
      {hasLyrics && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Точность текста</Label>
            <span className="text-xs text-muted-foreground">{lyricsWeight}%</span>
          </div>
          <Slider
            value={[lyricsWeight]}
            onValueChange={([value]) => onLyricsWeightChange(value)}
            min={0}
            max={100}
            step={5}
            disabled={isGenerating}
            className="w-full"
          />
        </div>
      )}

      {/* Weirdness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Креативность</Label>
          <span className="text-xs text-muted-foreground">{weirdness}%</span>
        </div>
        <Slider
          value={[weirdness]}
          onValueChange={([value]) => onWeirdnessChange(value)}
          min={0}
          max={100}
          step={10}
          disabled={isGenerating}
          className="w-full"
        />
      </div>
    </div>
  );
});

AdvancedControls.displayName = 'AdvancedControls';
