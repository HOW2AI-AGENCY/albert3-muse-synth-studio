import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from '@/utils/iconImports';
import { VOCAL_GENDER_OPTIONS, type VocalGender } from '../types/generator.types';
import { getProviderConfig, type MusicProvider } from '@/config/provider-limits';

interface AdvancedControlsProps {
  provider: MusicProvider;
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
  provider,
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
  const config = getProviderConfig(provider);
  const features = config.features;
  
  return (
    <div className="space-y-4">
      {/* Информация о провайдере */}
      {provider === 'mureka' && (
        <Alert variant="default" className="border-info/50 bg-info/5">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-xs">
            Mureka имеет ограниченный набор расширенных настроек. Используйте Suno для полного контроля.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Vocal Gender - только для Suno */}
      {features.vocalGenderSelection && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Тип вокала</Label>
          <ToggleGroup 
            type="single"
            value={vocalGender} 
            onValueChange={(v) => v && onVocalGenderChange(v as VocalGender)}
            disabled={isGenerating}
            className="justify-start gap-1.5"
          >
            {VOCAL_GENDER_OPTIONS.map((option) => (
              <ToggleGroupItem 
                key={option.value} 
                value={option.value} 
                className="h-8 px-3 text-xs data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:border-primary/50"
                disabled={isGenerating}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      {/* Audio Weight - только для Suno */}
      {features.audioWeight && hasReferenceAudio && (
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

      {/* Style Weight - только для Suno */}
      {features.styleWeight && (
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
      )}

      {/* Lyrics Weight - только для Suno */}
      {features.lyricsWeight && hasLyrics && (
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

      {/* Weirdness - только для Suno */}
      {features.weirdnessConstraint && (
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
      )}
    </div>
  );
});

AdvancedControls.displayName = 'AdvancedControls';
