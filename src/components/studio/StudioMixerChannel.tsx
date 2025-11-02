import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { StudioTrack } from '@/hooks/studio/useStudioSession';
import { Volume2, VolumeX, Disc, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface StudioMixerChannelProps {
  track: StudioTrack;
  onVolumeChange: (trackId: string, volume: number) => void;
  onPanChange: (trackId: string, pan: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onRemove: (trackId: string) => void;
}

export const StudioMixerChannel = ({
  track,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onRemove,
}: StudioMixerChannelProps) => {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{track.name}</h3>
            {track.isStem && (
              <Badge variant="secondary" className="text-xs mt-1">
                {track.stemType}
              </Badge>
            )}
          </div>
          <Button
            onClick={() => onRemove(track.id)}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Separator />

        {/* Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Volume</span>
            <span className="text-xs font-mono">
              {Math.round(track.volume * 100)}%
            </span>
          </div>
          <Slider
            value={[track.volume]}
            onValueChange={([value]) => onVolumeChange(track.id, value)}
            min={0}
            max={1}
            step={0.01}
          />
        </div>

        {/* Pan */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pan</span>
            <span className="text-xs font-mono">
              {track.pan === 0 ? 'C' : track.pan > 0 ? `R${Math.round(track.pan * 100)}` : `L${Math.round(Math.abs(track.pan) * 100)}`}
            </span>
          </div>
          <Slider
            value={[track.pan]}
            onValueChange={([value]) => onPanChange(track.id, value)}
            min={-1}
            max={1}
            step={0.01}
          />
        </div>

        <Separator />

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={() => onMuteToggle(track.id)}
            size="sm"
            variant={track.muted ? 'default' : 'outline'}
            className="flex-1 gap-2"
          >
            {track.muted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
            Mute
          </Button>
          <Button
            onClick={() => onSoloToggle(track.id)}
            size="sm"
            variant={track.solo ? 'default' : 'outline'}
            className="flex-1 gap-2"
          >
            <Disc className="h-3.5 w-3.5" />
            Solo
          </Button>
        </div>
      </div>
    </Card>
  );
};
