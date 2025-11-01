/**
 * Progress bar with time display for desktop player
 */
import { memo } from 'react';
import { Slider } from '@/components/ui/slider';
import { formatTime } from '@/utils/formatters';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  bufferingProgress: number;
  onSeek: (time: number) => void;
}

export const ProgressBar = memo(({ 
  currentTime, 
  duration, 
  bufferingProgress, 
  onSeek 
}: ProgressBarProps) => {
  return (
    <div className="w-full flex items-center gap-4">
      <span className="text-xs font-medium text-foreground/80 tabular-nums min-w-[40px]">
        {formatTime(currentTime)}
      </span>
      <div className="flex-1 relative group">
        {/* Buffering progress indicator */}
        {bufferingProgress > 0 && bufferingProgress < 100 && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-gradient-primary rounded-full transition-all duration-300 animate-pulse"
            style={{ width: `${bufferingProgress}%` }}
          >
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full animate-ping" />
          </div>
        )}
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          aria-label="Seek progress"
          onValueChange={(value) => onSeek(value[0])}
          className="cursor-pointer group-hover:scale-y-125 transition-transform duration-200"
        />
        {/* Progress indicator */}
        <div 
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full -translate-y-1/2 transition-all duration-100 shadow-glow-primary"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground/80 tabular-nums min-w-[40px] text-right">
        {formatTime(duration)}
      </span>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
