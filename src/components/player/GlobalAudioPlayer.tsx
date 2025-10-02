import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1 } from 'lucide-react';
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

  const toggleMute = () => {
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-card via-card/95 to-card backdrop-blur-xl border-t border-border/50 shadow-2xl z-50">
      <div className="max-w-screen-2xl mx-auto flex items-center gap-4 p-4">
        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
              {currentTrack.cover_url ? (
                <img 
                  src={currentTrack.cover_url} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/30 to-secondary/30 flex items-center justify-center text-2xl">
                  🎵
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold truncate text-foreground">{currentTrack.title}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                {currentTrack.style_tags && currentTrack.style_tags.length > 0 ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {currentTrack.style_tags.slice(0, 3).join(" • ")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">AI Generated</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl">
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={playPrevious}
              className="h-9 w-9 hover:bg-primary/10 transition-colors"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              size="icon"
              variant="default"
              onClick={togglePlayPause}
              className="h-12 w-12 rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={playNext}
              className="h-9 w-9 hover:bg-primary/10 transition-colors"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="w-full flex items-center gap-3">
            <span className="text-xs font-medium text-foreground tabular-nums">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={(value) => seekTo(value[0])}
              className="flex-1 cursor-pointer"
            />
            <span className="text-xs font-medium text-foreground tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3 min-w-[180px]">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            className="h-9 w-9 hover:bg-primary/10 transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : volume < 0.5 ? (
              <Volume1 className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs font-medium text-muted-foreground tabular-nums w-8 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
