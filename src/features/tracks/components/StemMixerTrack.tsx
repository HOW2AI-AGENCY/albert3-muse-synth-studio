import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Music4, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
}

interface StemMixerTrackProps {
  stem: TrackStem;
  isActive: boolean;
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
  onToggleActive: () => void;
  onToggleSolo: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
}

const stemTypeLabels: Record<string, string> = {
  vocals: 'Вокал',
  backing_vocals: 'Бэк-вокал',
  instrumental: 'Инструментал',
  original: 'Оригинал',
  drums: 'Ударные',
  bass: 'Бас',
  guitar: 'Гитара',
  keyboard: 'Клавишные',
  strings: 'Струнные',
  brass: 'Духовые (медные)',
  woodwinds: 'Духовые (деревянные)',
  percussion: 'Перкуссия',
  synth: 'Синтезатор',
  fx: 'Эффекты',
};

const formatStemLabel = (stemType: string) => {
  if (stemTypeLabels[stemType]) {
    return stemTypeLabels[stemType];
  }
  return stemType
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const StemMixerTrack = ({
  stem,
  isActive,
  volume,
  isMuted,
  isSolo,
  onToggleActive,
  onToggleSolo,
  onToggleMute,
  onVolumeChange,
}: StemMixerTrackProps) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        isActive && !isMuted && 'border-primary/50 bg-primary/5',
        isSolo && 'border-yellow-500/50 bg-yellow-500/5',
        !isActive && 'opacity-60'
      )}
    >
      {/* Toggle Active */}
      <div className="flex items-center gap-2 w-36 sm:w-40 shrink-0">
        <Switch
          checked={isActive}
          onCheckedChange={onToggleActive}
          className="touch-action-manipulation"
        />
        <Music4 className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">
          {formatStemLabel(stem.stem_type)}
        </span>
      </div>

      {/* Solo & Mute Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant={isSolo ? 'default' : 'outline'}
          onClick={onToggleSolo}
          className="h-8 w-8 p-0 touch-action-manipulation"
          disabled={!isActive}
        >
          <span className="text-xs font-bold">S</span>
        </Button>
        <Button
          size="sm"
          variant={isMuted ? 'destructive' : 'outline'}
          onClick={onToggleMute}
          className="h-8 w-8 p-0 touch-action-manipulation"
          disabled={!isActive}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Volume Slider */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <Slider
          value={[volume * 100]}
          onValueChange={([v]) => onVolumeChange(v / 100)}
          max={100}
          step={1}
          disabled={!isActive}
          className="flex-1 touch-action-manipulation"
        />
        <span className="text-xs text-muted-foreground w-10 text-right tabular-nums shrink-0">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};
