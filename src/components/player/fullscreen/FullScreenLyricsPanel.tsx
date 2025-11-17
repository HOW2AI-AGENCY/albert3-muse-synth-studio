/**
 * Full Screen Lyrics Panel Component
 * Displays track lyrics with timestamped highlighting
 */

import { memo } from 'react';
import { LyricsDisplay } from '../LyricsDisplay';

interface FullScreenLyricsPanelProps {
  taskId: string;
  audioId: string;
  fallbackLyrics?: string | null;
  showLyrics: boolean;
  className?: string;
}

export const FullScreenLyricsPanel = memo(({ 
  taskId,
  audioId,
  fallbackLyrics,
  showLyrics,
  className = '',
}: FullScreenLyricsPanelProps) => {
  if (!showLyrics) return null;

  return (
    <div className={`flex-1 w-full overflow-hidden mb-[--space-3] md:mb-[--space-6] ${className}`}>
      <LyricsDisplay
        taskId={taskId}
        audioId={audioId}
        fallbackLyrics={fallbackLyrics || undefined}
      />
    </div>
  );
}, (prev, next) => 
  prev.taskId === next.taskId &&
  prev.audioId === next.audioId &&
  prev.showLyrics === next.showLyrics &&
  prev.fallbackLyrics === next.fallbackLyrics
);

FullScreenLyricsPanel.displayName = 'FullScreenLyricsPanel';
