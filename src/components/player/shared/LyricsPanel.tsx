import { memo } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useCurrentTrack } from '@/stores/audioPlayerStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Track } from '@/types/track';

interface LyricsPanelProps {
  track: Track;
}

export const LyricsPanel = memo(({ track }: LyricsPanelProps) => {
  const { data } = useTimestampedLyrics(track.suno_id, track.lyrics);
  const lyrics = data?.lines ?? [];
  const currentLine = data?.currentLine ?? 0;

  return (
    <ScrollArea className="h-full">
      <div className="px-4 py-2">
        {lyrics.map((line, index) => (
          <p
            key={index}
            className={`transition-all duration-300 ${
              index === currentLine
                ? 'text-lg font-bold text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {line.text}
          </p>
        ))}
      </div>
    </ScrollArea>
  );
});
