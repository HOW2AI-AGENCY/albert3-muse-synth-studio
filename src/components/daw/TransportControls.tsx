/**
 * Transport Controls Component
 *
 * Playback controls for DAW:
 * - Play/Pause/Stop
 * - Record
 * - Loop controls
 * - BPM and time signature
 * - Timeline position display
 *
 * @module components/daw/TransportControls
 */

import { useCallback, type FC, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDAWStore } from '@/stores/daw';
import {
  Play,
  Pause,
  Square,
  Circle,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransportControlsProps {
  className?: string;
}

export const TransportControls: FC<TransportControlsProps> = ({ className }) => {
  const isPlaying = useDAWStore((state) => state.isPlaying);
  const isRecording = useDAWStore((state) => state.isRecording);
  const timeline = useDAWStore((state) => state.timeline);
  const project = useDAWStore((state) => state.project);

  const play = useDAWStore((state) => state.play);
  const pause = useDAWStore((state) => state.pause);
  const stop = useDAWStore((state) => state.stop);
  const seekTo = useDAWStore((state) => state.seekTo);
  const toggleLoop = useDAWStore((state) => state.toggleLoop);
  const updateBPM = useDAWStore((state) => state.updateBPM);

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

  const handleBPMChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newBPM = parseInt(e.target.value);
      if (!isNaN(newBPM) && newBPM > 0 && newBPM <= 300) {
        updateBPM(newBPM);
      }
    },
    [updateBPM]
  );

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2 bg-surface border-b border-border',
        className
      )}
    >
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-2">
        {/* Skip Back */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleSkipBack}
          disabled={currentTime === 0}
          title="Skip back 5s"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Play/Pause */}
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10"
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        {/* Stop */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleStop}
          disabled={!isPlaying && currentTime === 0}
          title="Stop"
        >
          <Square className="h-4 w-4" />
        </Button>

        {/* Skip Forward */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleSkipForward}
          disabled={currentTime >= duration}
          title="Skip forward 5s"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Loop */}
        <Button
          variant={isLooping ? 'default' : 'outline'}
          size="icon"
          onClick={toggleLoop}
          title={isLooping ? 'Loop enabled' : 'Loop disabled'}
        >
          {isLooping ? (
            <Repeat1 className="h-4 w-4" />
          ) : (
            <Repeat className="h-4 w-4" />
          )}
        </Button>

        {/* Record (placeholder - not implemented yet) */}
        <Button
          variant={isRecording ? 'destructive' : 'outline'}
          size="icon"
          disabled
          title="Record (coming soon)"
        >
          <Circle className={cn('h-4 w-4', isRecording && 'fill-current')} />
        </Button>
      </div>

      {/* Center: Time Display */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground">Position</span>
          <span className="text-lg font-mono font-semibold tabular-nums">
            {formatTime(currentTime)}
          </span>
        </div>
        <div className="text-muted-foreground">/</div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground">Duration</span>
          <span className="text-lg font-mono tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Tempo and Time Signature */}
      <div className="flex items-center gap-3">
        {/* BPM */}
        <div className="flex items-center gap-2">
          <label htmlFor="bpm" className="text-sm font-medium">
            BPM
          </label>
          <Input
            id="bpm"
            type="number"
            value={bpm}
            onChange={handleBPMChange}
            min={40}
            max={300}
            className="w-20 h-9 text-center"
          />
        </div>

        {/* Time Signature (read-only for now) */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Time</span>
          <div className="flex items-center justify-center border rounded-md h-9 px-3 bg-muted">
            <span className="text-sm font-mono">
              {project?.timeSignature[0] || 4}/{project?.timeSignature[1] || 4}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
