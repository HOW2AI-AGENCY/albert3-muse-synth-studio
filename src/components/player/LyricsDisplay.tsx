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

  // ✅ P1 FIX: Get player controls for keyboard/gesture support
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);

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
    <div className="w-full h-full relative">
      {/* Settings Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSettings(true)}
        className="absolute top-2 right-2 z-10 h-9 w-9 p-0 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
        aria-label="Настройки лирики"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Lyrics Display */}
      {lyricsData && (
        <TimestampedLyricsDisplay
          lyricsData={lyricsData.alignedWords}
          currentTime={currentTime}
          settings={settings}
          className="w-full h-full"
          onSeek={seekTo}
          onTogglePlayPause={togglePlayPause}
        />
      )}

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
