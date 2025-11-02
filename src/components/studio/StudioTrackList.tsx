import { StudioTrack } from '@/hooks/studio/useStudioSession';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StudioTrackListProps {
  tracks: StudioTrack[];
  selectedTrack: string | null;
  onTrackSelect: (trackId: string) => void;
}

export const StudioTrackList = ({
  tracks,
  selectedTrack,
  onTrackSelect,
}: StudioTrackListProps) => {
  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {tracks.map((track) => (
        <Card
          key={track.id}
          className={`p-3 cursor-pointer transition-all ${
            selectedTrack === track.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onTrackSelect(track.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: track.color }}
              />
              <span className="font-medium text-sm">{track.name}</span>
              {track.isStem && (
                <Badge variant="secondary" className="text-xs">
                  {track.stemType}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
