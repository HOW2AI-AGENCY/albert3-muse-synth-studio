/**
 * Mobile Transport Bar Component
 *
 * Compact playback controls for mobile:
 * - Large touch targets
 * - Essential controls only
 * - Time display
 * - BPM indicator
 *
 * @module components/daw/mobile/MobileTransportBar
 */

import { FC, useCallback } from 'react';
import { useDAWStore } from '@/stores/daw';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
} from 'lucide-react';

export const MobileTransportBar: FC = () => {
  const isPlaying = useDAWStore((state) => state.isPlaying);
  const timeline = useDAWStore((state) => state.timeline);
  const project = useDAWStore((state) => state.project);

  const play = useDAWStore((state) => state.play);
  const pause = useDAWStore((state) => state.pause);
  const stop = useDAWStore((state) => state.stop);
  const seekTo = useDAWStore((state) => state.seekTo);
  const toggleLoop = useDAWStore((state) => state.toggleLoop);

  const { currentTime, duration, isLooping } = timeline;
  const bpm = project?.bpm || 120;

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleSkipBack = useCallback(() => {
    seekTo(Math.max(0, currentTime - 5));
  }, [currentTime, seekTo]);

  const handleSkipForward = useCallback(() => {
    seekTo(Math.min(duration, currentTime + 5));
  }, [currentTime, duration, seekTo]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-shrink-0 h-20 px-4 py-2 border-t-2 border-border bg-surface">
      {/* Time Display */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold tabular-nums">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* BPM Indicator */}
          <div className="px-2 py-0.5 bg-muted rounded text-xs font-medium">
            {bpm} BPM
          </div>

          {/* Loop Button */}
          <Button
            variant={isLooping ? 'default' : 'ghost'}
            size="sm"
            className="h-6 w-6 p-0"
            onClick={toggleLoop}
          >
            {isLooping ? (
              <Repeat1 className="h-3 w-3" />
            ) : (
              <Repeat className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Skip Back */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleSkipBack}
          disabled={currentTime === 0}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Play/Pause */}
        <Button
          variant="default"
          size="icon"
          className="h-12 w-12"
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Stop */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleStop}
          disabled={!isPlaying && currentTime === 0}
        >
          <Square className="h-4 w-4" />
        </Button>

        {/* Skip Forward */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleSkipForward}
          disabled={currentTime >= duration}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
