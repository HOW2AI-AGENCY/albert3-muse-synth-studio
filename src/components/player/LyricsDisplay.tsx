import React, { memo } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import TimestampedLyricsDisplay from '../lyrics/TimestampedLyricsDisplay';
import { LyricsSkeleton } from './LyricsSkeleton';

interface LyricsDisplayProps {
  taskId: string;
  audioId: string;
  fallbackLyrics?: string;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = memo(({ taskId, audioId, fallbackLyrics }) => {
  const shouldFetchTimestamped = Boolean(
    taskId && 
    typeof taskId === 'string' && 
    taskId.trim().length > 0 &&
    taskId !== 'null' &&
    taskId !== 'undefined' &&
    audioId && 
    typeof audioId === 'string' && 
    audioId.trim().length > 0
  );

  const { data: lyricsData, isLoading, isError } = useTimestampedLyrics({
    taskId: taskId || '',
    audioId: audioId || '',
    enabled: shouldFetchTimestamped
  });

  const hasValidLyrics = Boolean(
    lyricsData?.alignedWords && 
    Array.isArray(lyricsData.alignedWords) && 
    lyricsData.alignedWords.length > 0
  );
  const currentTime = useAudioPlayerStore((state) => state.currentTime);

  if (!shouldFetchTimestamped) {
    if (fallbackLyrics) {
      return (
        <div className="lyrics-display w-full h-full max-h-60 overflow-y-auto text-center py-4 px-2">
          <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
            {fallbackLyrics}
          </p>
        </div>
      );
    }
    return <div className="text-center text-muted-foreground py-8">Текст не найден.</div>;
  }

  if (isLoading) {
    return <LyricsSkeleton className="w-full h-full" />;
  }

  if (isError || !hasValidLyrics) {
    if (fallbackLyrics) {
      return (
        <div className="lyrics-display w-full h-full max-h-60 overflow-y-auto text-center py-4 px-2">
          <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
            {fallbackLyrics}
          </p>
        </div>
      );
    }
    return <div className="text-center text-muted-foreground py-8">Текст не найден.</div>;
  }

  return (
    <div className="w-full h-full">
      {lyricsData && (
        <TimestampedLyricsDisplay
          lyricsData={lyricsData.alignedWords}
          currentTime={currentTime}
          className="w-full h-full"
        />
      )}
    </div>
  );
});

LyricsDisplay.displayName = 'LyricsDisplay';
