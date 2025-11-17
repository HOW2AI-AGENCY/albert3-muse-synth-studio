import React, { memo, useState } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useLyricsSettings } from '@/hooks/useLyricsSettings';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import TimestampedLyricsDisplay from '../lyrics/TimestampedLyricsDisplay';
import { LyricsSettingsDialog } from '../lyrics/LyricsSettingsDialog';
import { LyricsSkeleton } from './LyricsSkeleton';
import { Button } from '@/components/ui/button';
import { Settings } from '@/utils/iconImports';

interface LyricsDisplayProps {
  taskId: string;
  audioId: string;
  fallbackLyrics?: string;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = memo(({ taskId, audioId, fallbackLyrics }) => {
  const [showSettings, setShowSettings] = useState(false);
  const { settings, updateSettings } = useLyricsSettings();

  // ✅ Get player controls for timestamped lyrics
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);

  const shouldFetchTimestamped = Boolean(
    taskId && 
    typeof taskId === 'string' && 
    taskId.trim().length > 0 &&
    taskId !== 'null' &&
    taskId !== 'undefined' &&
    audioId && 
    typeof audioId === 'string' && 
    audioId.trim().length > 0 &&
    audioId !== 'null' &&
    audioId !== 'undefined'
  );

  const { data: lyricsData, isLoading, isError } = useTimestampedLyrics({
    taskId: taskId || '',
    audioId: audioId || '',
    enabled: shouldFetchTimestamped
  });

  // Better validation for lyrics data
  const hasTimestampedLyrics = Boolean(
    lyricsData?.alignedWords &&
    Array.isArray(lyricsData.alignedWords) &&
    lyricsData.alignedWords.length > 0
  );

  // Show skeleton during loading
  if (isLoading && !hasTimestampedLyrics) {
    return <LyricsSkeleton />;
  }

  // Show plain text lyrics if timestamped failed but we have fallback
  if ((isError || !hasTimestampedLyrics) && fallbackLyrics) {
    return (
      <div className="lyrics-display w-full h-full overflow-y-auto text-center py-4 px-2">
        <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
          {fallbackLyrics}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      {/* Settings Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSettings(true)}
        className="absolute top-2 right-2 z-10 h-9 w-9 p-0 bg-background/80 hover:bg-background/90 backdrop-blur-sm shrink-0"
        aria-label="Настройки лирики"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Lyrics Display */}
      <div className="flex-1 overflow-hidden min-h-0">
        {hasTimestampedLyrics && lyricsData ? (
          <TimestampedLyricsDisplay
            lyricsData={lyricsData.alignedWords}
            currentTime={currentTime}
            settings={settings}
            className="w-full h-full"
            onSeek={seekTo}
            onTogglePlayPause={togglePlayPause}
          />
        ) : !hasTimestampedLyrics && fallbackLyrics ? (
          <div className="w-full h-full overflow-y-auto px-4 py-2">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
              {fallbackLyrics}
            </pre>
          </div>
        ) : null}
      </div>

      {/* Settings Dialog */}
      <LyricsSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    </div>
  );
});

LyricsDisplay.displayName = 'LyricsDisplay';
