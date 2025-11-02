import { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { StudioTrack } from '@/hooks/studio/useStudioSession';
import { StudioTrackRow } from './StudioTrackRow';

interface StudioTimelineProps {
  tracks: StudioTrack[];
  currentTime: number;
  zoom: number;
  selectedTrack: string | null;
  onTrackSelect: (trackId: string) => void;
  onSeek: (time: number) => void;
}

export const StudioTimeline = ({
  tracks,
  currentTime,
  zoom,
  selectedTrack,
  onTrackSelect,
  onSeek,
}: StudioTimelineProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const maxDuration = Math.max(...tracks.map((t) => t.duration), 60);
  const pixelsPerSecond = 20 * zoom;
  const timelineWidth = maxDuration * pixelsPerSecond;

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = x / pixelsPerSecond;
      onSeek(Math.max(0, Math.min(time, maxDuration)));
    }
  };

  return (
    <div className="space-y-2">
      {/* Ruler */}
      <Card className="p-2 bg-card/50 border-border">
        <div
          ref={timelineRef}
          className="relative h-8 cursor-pointer"
          style={{ width: timelineWidth }}
          onClick={handleTimelineClick}
        >
          {/* Time markers */}
          {Array.from({ length: Math.ceil(maxDuration / 5) + 1 }).map((_, i) => {
            const time = i * 5;
            return (
              <div
                key={time}
                className="absolute top-0 bottom-0 border-l border-border/50"
                style={{ left: time * pixelsPerSecond }}
              >
                <span className="text-xs text-muted-foreground ml-1">
                  {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                </span>
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
            style={{ left: currentTime * pixelsPerSecond }}
          >
            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rounded-full" />
          </div>
        </div>
      </Card>

      {/* Tracks */}
      <div className="space-y-2">
        {tracks.map((track) => (
          <StudioTrackRow
            key={track.id}
            track={track}
            pixelsPerSecond={pixelsPerSecond}
            isSelected={selectedTrack === track.id}
            onClick={() => onTrackSelect(track.id)}
          />
        ))}
      </div>
    </div>
  );
};
