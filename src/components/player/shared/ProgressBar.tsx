import { memo } from 'react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { Slider } from '@/components/ui/slider';
import { formatDuration } from '@/utils/formatters';

export const ProgressBar = memo(() => {
  const { currentTime, duration, seekTo } = useAudioPlayerStore(state => ({
    currentTime: state.currentTime,
    duration: state.duration,
    seekTo: state.seekTo,
  }));

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {formatDuration(currentTime)}
      </span>
      <Slider
        value={[currentTime]}
        max={duration}
        onValueChange={([value]) => seekTo(value)}
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground">
        {formatDuration(duration)}
      </span>
    </div>
  );
});
