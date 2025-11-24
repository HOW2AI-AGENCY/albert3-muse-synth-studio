import { memo } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Track } from '@/types/track';

interface LyricsPanelProps {
  track: Track;
}

export const LyricsPanel = memo(({ track }: LyricsPanelProps) => {
  const { data } = useTimestampedLyrics({
    taskId: track.suno_task_id,
    audioId: track.suno_id,
  });
  
  const alignedWords = data?.alignedWords ?? [];

  return (
    <ScrollArea className="h-full">
      <div className="px-4 py-2">
        {alignedWords.map((word, index) => (
          <span
            key={index}
            className="mr-1 transition-all duration-300 text-muted-foreground"
          >
            {word.word}
          </span>
        ))}
      </div>
    </ScrollArea>
  );
});
