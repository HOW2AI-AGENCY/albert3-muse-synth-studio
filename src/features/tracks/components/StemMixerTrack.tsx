import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Music4 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StemWaveform } from './StemWaveform';
import { StemContextMenu } from './StemContextMenu';

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  track_id: string;
}

interface StemMixerTrackProps {
  stem: TrackStem;
  isActive: boolean;
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
  currentTime?: number;
  duration?: number;
  trackTitle?: string;
  onToggleActive: () => void;
  onToggleSolo: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onUseAsReference?: (audioUrl: string, stemType: string) => void;
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
  currentTime = 0,
  duration = 0,
  trackTitle,
  onToggleActive,
  onToggleSolo,
  onToggleMute,
  onVolumeChange,
  onUseAsReference,
}: StemMixerTrackProps) => {
  return (
    <StemContextMenu 
      stem={stem} 
      trackTitle={trackTitle}
      onUseAsReference={onUseAsReference}
    >
      <div
        className={cn(
          'flex flex-col gap-2 p-3 rounded-lg border transition-all',
          isActive && !isMuted && 'border-primary/50 bg-primary/5',
          isSolo && 'border-yellow-500/50 bg-yellow-500/5 ring-1 ring-yellow-500/20',
          !isActive && 'opacity-60'
        )}
      >
      {/* Main controls row */}
      <div className="flex items-center gap-3">
        {/* Toggle Active */}
        <div className="flex items-center gap-2 w-32 sm:w-36 shrink-0">
          <Switch
            checked={isActive}
            onCheckedChange={onToggleActive}
            className="touch-action-manipulation"
          />
          <Music4 className={cn(
            "w-4 h-4 shrink-0 transition-colors",
            isActive ? "text-primary" : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-sm font-medium truncate transition-colors",
            isActive && "text-foreground",
            !isActive && "text-muted-foreground"
          )}>
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
            title="Solo (S)"
          >
            <span className="text-xs font-bold">S</span>
          </Button>
          <Button
            size="sm"
            variant={isMuted ? 'destructive' : 'outline'}
            onClick={onToggleMute}
            className="h-8 w-8 p-0 touch-action-manipulation"
            disabled={!isActive}
            title="Mute (M)"
          >
            <span className="text-xs font-bold">M</span>
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

      {/* Waveform visualization */}
      <StemWaveform
        audioUrl={stem.audio_url}
        isActive={isActive && !isMuted}
        currentTime={currentTime}
        duration={duration}
        className="w-full"
      />
    </div>
    </StemContextMenu>
  );
};
