import React, { useEffect, useRef } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useCurrentTrack, useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { cn } from '@/lib/utils';

interface LyricsDisplayProps {
  taskId: string;
  audioId: string;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ taskId, audioId }) => {
  const { data: lyricsData, isLoading, isError } = useTimestampedLyrics({ taskId, audioId });
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lyricsData?.alignedWords && containerRef.current) {
      const currentWordIndex = lyricsData.alignedWords.findIndex(
        (word) => currentTime >= word.startS && currentTime <= word.endS
      );

      if (currentWordIndex !== -1) {
        const activeWordElement = containerRef.current.children[currentWordIndex] as HTMLElement;
        if (activeWordElement) {
          // Scroll the active word into view
          activeWordElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    }
  }, [currentTime, lyricsData]);

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Загрузка текста...</div>;
  }

  if (isError || !lyricsData || lyricsData.alignedWords.length === 0) {
    return <div className="text-center text-muted-foreground">Текст не найден.</div>;
  }

  return (
    <div ref={containerRef} className="lyrics-display max-h-60 overflow-y-auto text-center py-4">
      {lyricsData.alignedWords.map((word, index) => (
        <span
          key={index}
          className={cn(
            'text-lg transition-colors duration-200',
            currentTime >= word.startS && currentTime <= word.endS
              ? 'text-primary font-bold'
              : 'text-muted-foreground'
          )}
        >
          {word.word}{' '}
        </span>
      ))}
    </div>
  );
};
