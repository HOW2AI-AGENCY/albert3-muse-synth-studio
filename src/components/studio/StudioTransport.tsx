import { Button } from '@/components/ui/button';
import { Play, Pause, Square, SkipBack } from 'lucide-react';
import { formatDuration } from '@/utils/formatters';

interface StudioTransportProps {
  isPlaying: boolean;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
}

export const StudioTransport = ({
  isPlaying,
  currentTime,
  onPlay,
  onPause,
  onStop,
}: StudioTransportProps) => {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Button
          onClick={onStop}
          size="sm"
          variant="outline"
          className="h-9 w-9 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          onClick={onStop}
          size="sm"
          variant="outline"
          className="h-9 w-9 p-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          onClick={isPlaying ? onPause : onPlay}
          size="sm"
          variant="default"
          className="h-9 w-9 p-0 bg-gradient-primary"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm font-mono">
        <span className="text-foreground">{formatDuration(Math.floor(currentTime))}</span>
      </div>
    </div>
  );
};
