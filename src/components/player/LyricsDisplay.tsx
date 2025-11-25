import React, { memo, useState } from 'react';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useLyricsSettings } from '@/hooks/useLyricsSettings';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { VirtualizedTimestampedLyrics } from '../lyrics/VirtualizedTimestampedLyrics';
import { LyricsSettingsDialog } from '../lyrics/LyricsSettingsDialog';
import { LyricsSkeleton } from './LyricsSkeleton';
import { Button } from '@/components/ui/button';
import { Settings } from '@/utils/iconImports';

interface LyricsDisplayProps {
  taskId: string;
  audioId: string;
  fallbackLyrics?: string;
  isVisible?: boolean;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = memo(({ taskId, audioId, fallbackLyrics, isVisible = true }) => {
  const [showSettings, setShowSettings] = useState(false);
  const { settings, updateSettings } = useLyricsSettings();

  // ✅ Get player controls for timestamped lyrics
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);

  const shouldFetchTimestamped = Boolean(
    isVisible &&
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

  const { data: lyricsData, isLoading } = useTimestampedLyrics({
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

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Continue to main render; fallback and placeholders handled below

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

      <div className="flex-1 overflow-hidden min-h-0">
        {hasTimestampedLyrics && lyricsData ? (
          <VirtualizedTimestampedLyrics
            lyricsData={lyricsData.alignedWords}
            currentTime={currentTime}
            settings={settings}
            className="w-full h-full"
            onSeek={seekTo}
          />
        ) : (String(fallbackLyrics ?? '').trim().length > 0 ? (
          <div className="w-full h-full overflow-y-auto px-4 py-2">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
              {fallbackLyrics}
            </pre>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground px-4">
            <span className="text-sm">Текст не найден</span>
          </div>
        ))}
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
