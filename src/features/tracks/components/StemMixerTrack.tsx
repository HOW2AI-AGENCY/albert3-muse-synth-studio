import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Music4, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StemWaveform } from './StemWaveform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileAudio, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { useConvertToWav } from '@/hooks/useConvertToWav';

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
  const { convertToWav, isConverting } = useConvertToWav();

  const handleDownloadMP3 = async () => {
    try {
      const response = await fetch(stem.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trackTitle || 'track'}_${stem.stem_type}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Стем "${stem.stem_type}" скачан`);
    } catch (error) {
      console.error('Failed to download stem:', error);
      toast.error('Ошибка скачивания стема');
    }
  };

  const handleConvertToWav = async () => {
    try {
      await convertToWav({
        trackId: stem.track_id,
        audioId: stem.id,
      });
    } catch (error) {
      console.error('Failed to convert stem:', error);
      toast.error('Ошибка конвертации стема');
    }
  };

  const handleUseAsReference = () => {
    onUseAsReference?.(stem.audio_url, stem.stem_type);
    toast.success(`Стем "${stem.stem_type}" установлен как референс`);
  };

  return (
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

        {/* Menu Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 shrink-0"
              title="Опции стема"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleDownloadMP3}>
              <Download className="w-4 h-4 mr-2" />
              Скачать MP3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleConvertToWav} disabled={isConverting}>
              <FileAudio className="w-4 h-4 mr-2" />
              {isConverting ? 'Конвертация...' : 'Конвертировать в WAV'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleUseAsReference}>
              <Music2 className="w-4 h-4 mr-2" />
              Использовать как референс
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  );
};
