/**
 * MobileProgressBar Component
 *
 * Optimized progress bar for mobile fullscreen player.
 * Subscribes to currentTime/duration internally to prevent
 * parent FullScreenPlayer from re-rendering at 60 FPS.
 *
 * Pattern: Same as desktop/ProgressBar.tsx
 *
 * @version 1.0.0
 * @created 2025-11-07
 */

import { memo, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { cn } from '@/lib/utils';

interface MobileProgressBarProps {
  onSeek: (value: number[]) => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const MobileProgressBar = memo(({ onSeek, className }: MobileProgressBarProps) => {
  // ✅ OPTIMIZATION: Internal subscriptions - doesn't trigger parent re-renders
  // This prevents FullScreenPlayer from re-rendering at 60 FPS (3,600 times/min)
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const duration = useAudioPlayerStore((state) => state.duration);
  const bufferingProgress = useAudioPlayerStore((state) => state.bufferingProgress);

  // Memoize formatTime to avoid recreation on every render
  const formattedCurrentTime = useCallback(() => formatTime(currentTime), [currentTime])();
  const formattedDuration = useCallback(() => formatTime(duration), [duration])();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        {/* Buffering progress indicator */}
        {bufferingProgress > 0 && bufferingProgress < 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-primary/30 rounded-full transition-all duration-300 pointer-events-none"
            style={{ width: `${bufferingProgress}%` }}
          >
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        )}

        {/* Progress slider */}
        <Slider
          value={[Math.min(Math.max(currentTime, 0), Math.max(0, duration))]}
          max={Math.max(0, duration)}
          step={0.1}
          onValueChange={onSeek}
          className="w-full cursor-pointer hover:scale-y-110 transition-transform duration-200"
          aria-label={`Прогресс воспроизведения: ${formattedCurrentTime} из ${formattedDuration}`}
        />
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-muted-foreground/80 font-medium tabular-nums">
        <span>{formattedCurrentTime}</span>
        <span>{formattedDuration}</span>
      </div>
    </div>
  );
});

MobileProgressBar.displayName = 'MobileProgressBar';
