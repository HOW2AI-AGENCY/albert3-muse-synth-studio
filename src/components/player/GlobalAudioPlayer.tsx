import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const GlobalAudioPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlayPause,
    seekTo,
    setVolume,
    playNext,
    playPrevious,
  } = useAudioPlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  if (!currentTrack) return null;

  const handleVolumeToggle = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (newVolume > 0) setPreviousVolume(newVolume);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 w-64">
            {currentTrack.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-12 h-12 rounded object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{currentTrack.title}</div>
              {currentTrack.style_tags && currentTrack.style_tags.length > 0 && (
                <div className="text-xs text-muted-foreground truncate">
                  {currentTrack.style_tags.slice(0, 2).join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Controls & Progress */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={playPrevious}
                className="h-8 w-8"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                onClick={togglePlayPause}
                className="h-10 w-10"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" fill="currentColor" />
                ) : (
                  <Play className="h-5 w-5" fill="currentColor" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={playNext}
                className="h-8 w-8"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={(value) => seekTo(value[0])}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-12">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 w-32">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVolumeToggle}
              className="h-8 w-8"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
