import { useState, useEffect } from "react";
import { MiniPlayer } from "./MiniPlayer";
import { FullScreenPlayer } from "./FullScreenPlayer";
import { PlayerQueue } from "./PlayerQueue";
import { LoadingSkeleton } from "../ui/LoadingSkeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  // Keyboard shortcuts for desktop
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo(Math.min(currentTime + 10, duration));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(Math.max(currentTime - 10, 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(volume + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(volume - 0.1, 0));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, togglePlayPause, currentTime, duration, seekTo, volume, setVolume]);

  // Media Session API integration
  useMediaSession(
    currentTrack
      ? {
          title: currentTrack.title,
          artist: currentTrack.style_tags?.[0] || 'AI Generated',
          artwork: currentTrack.cover_url
            ? [
                {
                  src: currentTrack.cover_url,
                  sizes: '512x512',
                  type: 'image/jpeg',
                },
              ]
            : [],
        }
      : null,
    {
      onPlay: togglePlayPause,
      onPause: togglePlayPause,
      onNext: playNext,
      onPrevious: playPrevious,
      onSeek: seekTo,
    }
  );

  if (!currentTrack) return null;

  // Mobile: Use mini player + full screen player
  if (isMobile) {
    if (isExpanded) {
      return <FullScreenPlayer onMinimize={() => setIsExpanded(false)} />;
    }
    return <MiniPlayer onExpand={() => setIsExpanded(true)} />;
  }

  // Desktop: Enhanced player
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-primary/20 shadow-glow animate-slide-up">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-6">
          {/* Track Info */}
          <div className="flex items-center gap-4 min-w-0 flex-1 max-w-xs">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-300">
              {currentTrack.cover_url ? (
                <img
                  src={currentTrack.cover_url}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-primary animate-pulse" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm truncate animate-shimmer">
                {currentTrack.title}
              </h4>
              <div className="flex items-center gap-2">
                {currentTrack.style_tags && currentTrack.style_tags.length > 0 ? (
                  <p className="text-xs text-muted-foreground/80 truncate">
                    {currentTrack.style_tags.slice(0, 2).join(', ')}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/80">AI Generated</p>
                )}
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
                title="Предыдущий трек (←)"
                className="h-9 w-9 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              <Button
                size="icon"
                variant="default"
                onClick={togglePlayPause}
                title={isPlaying ? "Пауза (Space)" : "Воспроизвести (Space)"}
                className="h-12 w-12 rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all duration-200 hover:scale-105"
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
                title="Следующий трек (→)"
                className="h-9 w-9 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              <PlayerQueue />
            </div>

            {/* Progress Bar */}
            <div className="w-full flex items-center gap-3">
              <span className="text-xs font-medium text-foreground/80 tabular-nums">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={(value) => seekTo(value[0])}
                className="flex-1 cursor-pointer hover:scale-y-110 transition-transform duration-200"
              />
              <span className="text-xs font-medium text-foreground/80 tabular-nums">
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
              className="h-9 w-9 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
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
              className="flex-1 cursor-pointer hover:scale-y-110 transition-transform duration-200"
            />
            <span className="text-xs font-medium text-muted-foreground/80 tabular-nums w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
