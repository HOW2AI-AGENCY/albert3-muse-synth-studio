import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudioTrack } from '@/hooks/studio/useStudioSession';
import { Music, Volume2, VolumeX } from 'lucide-react';

interface StudioTrackRowProps {
  track: StudioTrack;
  pixelsPerSecond: number;
  isSelected: boolean;
  onClick: () => void;
}

export const StudioTrackRow = ({
  track,
  pixelsPerSecond,
  isSelected,
  onClick,
}: StudioTrackRowProps) => {
  const trackWidth = track.duration * pixelsPerSecond;

  return (
    <Card
      className={`p-3 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${track.muted ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-[200px]">
          {track.muted ? (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{track.name}</span>
          {track.isStem && (
            <Badge variant="secondary" className="text-xs">
              {track.stemType}
            </Badge>
          )}
        </div>
      </div>

      <div className="relative h-16 bg-muted/30 rounded overflow-hidden">
        {track.audioUrl ? (
          <div
            className="h-full rounded transition-all"
            style={{
              width: trackWidth,
              background: `linear-gradient(135deg, ${track.color}40, ${track.color}20)`,
              border: `1px solid ${track.color}60`,
            }}
          >
            <div className="h-full flex items-center justify-center">
              <Music className="h-6 w-6" style={{ color: track.color }} />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Music className="h-6 w-6" />
          </div>
        )}
      </div>
    </Card>
  );
};
