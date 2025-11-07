/**
 * Progress bar with time display for desktop player
 *
 * ✅ FIX: Subscribes to store internally to prevent parent re-renders
 * This component now gets currentTime/duration directly from store
 */
import { memo } from 'react';
import { Slider } from '@/components/ui/slider';
import { formatTime } from '@/utils/formatters';
import { motion } from 'framer-motion';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

interface ProgressBarProps {
  onSeek: (time: number) => void;
}

export const ProgressBar = memo(({
  onSeek
}: ProgressBarProps) => {
  // ✅ Subscribe to store internally - prevents parent from re-rendering 60 FPS
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const duration = useAudioPlayerStore((state) => state.duration);
  const bufferingProgress = useAudioPlayerStore((state) => state.bufferingProgress);
  const progressPercent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;

  return (
    <div
      className="w-full flex items-center gap-3"
      role="group"
      aria-label="Прогресс воспроизведения"
    >
      <span
        className="text-[10px] font-medium text-foreground/80 tabular-nums min-w-[35px]"
        aria-label="Текущее время"
      >
        {formatTime(currentTime)}
      </span>
      <div className="flex-1 relative group">
        {/* Buffering progress indicator with animation */}
        {bufferingProgress > 0 && bufferingProgress < 100 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-primary/30 rounded-full transition-all duration-300"
            style={{ width: `${bufferingProgress}%` }}
            aria-label={`Буферизация ${Math.round(bufferingProgress)}%`}
          >
            <motion.div
              className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        )}
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          aria-label={`Перемотка, ${progressPercent}% воспроизведено`}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-valuetext={`${formatTime(currentTime)} из ${formatTime(duration)}`}
          onValueChange={(value) => onSeek(value[0])}
          className="cursor-pointer group-hover:scale-y-125 [&_[role=slider]]:transition-all [&_[role=slider]]:duration-200 [&_[role=slider]]:hover:scale-125 [&_[role=slider]]:hover:shadow-glow-primary"
        />
        {/* Progress fill with gradient */}
        <motion.div
          className="absolute top-1/2 left-0 h-1 rounded-full -translate-y-1/2 bg-gradient-to-r from-primary to-accent shadow-glow-primary pointer-events-none"
          style={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.1 }}
          aria-hidden="true"
        />
      </div>
      <span
        className="text-[10px] font-medium text-foreground/80 tabular-nums min-w-[35px] text-right"
        aria-label="Общая длительность"
      >
        {formatTime(duration)}
      </span>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
