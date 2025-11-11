
import React, { useEffect, useRef, useMemo, memo } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { cn } from '@/lib/utils';
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
        <div className="lyrics-display max-h-60 overflow-y-auto text-center py-4">
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {fallbackLyrics}
          </p>
        </div>
      );
    }
    return <div className="text-center text-muted-foreground">Текст не найден.</div>;
  }

  if (isLoading) {
    return <LyricsSkeleton />;
  }

  if (isError || !hasValidLyrics) {
    if (fallbackLyrics) {
      return (
        <div className="lyrics-display max-h-60 overflow-y-auto text-center py-4 px-2">
          <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
            {fallbackLyrics}
          </p>
        </div>
      );
    }
    return <div className="text-center text-muted-foreground py-8">Текст не найден.</div>;
  }

  return (
    <TimestampedLyricsDisplay
      lyricsData={lyricsData.alignedWords}
      currentTime={currentTime}
    />
  );
});

LyricsDisplay.displayName = 'LyricsDisplay';
