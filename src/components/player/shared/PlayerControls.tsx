import { memo, useCallback } from 'react';
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioPlayerStore, useIsPlaying } from '@/stores/audioPlayerStore';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

export const PlayerControls = memo(() => {
  const isPlaying = useIsPlaying();
  const {
    togglePlayPause,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeatMode,
  } = useAudioPlayerStore();
  const { vibrate } = useHapticFeedback();

  const handleTogglePlay = useCallback(() => {
    vibrate('light');
    togglePlayPause();
  }, [togglePlayPause, vibrate]);

  return (
    <div className="flex items-center justify-between w-full">
      <Button variant="ghost" size="icon" onClick={toggleShuffle}>
        <Shuffle className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={playPrevious}>
        <SkipBack className="h-6 w-6" />
      </Button>
      <Button
        variant="default"
        className="h-16 w-16 rounded-full"
        onClick={handleTogglePlay}
      >
        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={playNext}>
        <SkipForward className="h-6 w-6" />
      </Button>
      <Button variant="ghost" size="icon" onClick={toggleRepeatMode}>
        <Repeat className="h-5 w-5" />
      </Button>
    </div>
  );
});
