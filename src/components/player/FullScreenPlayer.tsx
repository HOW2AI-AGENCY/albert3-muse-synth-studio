import { Play, Pause, SkipBack, SkipForward, Minimize2, Volume2, VolumeX, Share2, Download, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PlayerQueue } from "./PlayerQueue";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface FullScreenPlayerProps {
  onMinimize: () => void;
}

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const FullScreenPlayer = ({ onMinimize }: FullScreenPlayerProps) => {
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

  const { vibrate } = useHapticFeedback();
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const swipeRef = useSwipeGesture({
    onSwipeDown: () => {
      vibrate('medium');
      onMinimize();
    },
  });

  if (!currentTrack) return null;

  const handlePlayPause = () => {
    vibrate('light');
    togglePlayPause();
  };

  const handleNext = () => {
    vibrate('light');
    playNext();
  };

  const handlePrevious = () => {
    vibrate('light');
    playPrevious();
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    vibrate('light');
    if (isMuted) {
      setVolume(0.5);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleShare = async () => {
    vibrate('light');
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack.title,
          text: `Слушай этот трек: ${currentTrack.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Ссылка скопирована",
        description: "Ссылка на трек скопирована в буфер обмена",
      });
    }
  };

  const handleDownload = () => {
    vibrate('medium');
    if (currentTrack.audio_url) {
      window.open(currentTrack.audio_url, '_blank');
    }
  };

  const handleLike = () => {
    vibrate(isLiked ? 'light' : 'success');
    setIsLiked(!isLiked);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={swipeRef as any}
      className="fixed inset-0 z-50 bg-gradient-to-b from-background via-background to-card animate-fade-in"
    >
      <div className="flex flex-col h-full p-6 safe-area-inset">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="h-10 w-10"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-10 w-10"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <PlayerQueue />
          </div>
        </div>

        {/* Album Art */}
        <div className="flex-1 flex items-center justify-center mb-8">
          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl glow-primary animate-scale-in">
            {currentTrack.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-primary" />
            )}
          </div>
        </div>

        {/* Track Info */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {currentTrack.title}
          </h2>
          <p className="text-muted-foreground">
            {currentTrack.style_tags?.join(', ') || 'AI Generated'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="h-12 w-12"
          >
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            size="icon"
            onClick={handlePlayPause}
            className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 glow-primary"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" fill="currentColor" />
            ) : (
              <Play className="h-8 w-8" fill="currentColor" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-12 w-12"
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className="h-10 w-10"
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                isLiked ? 'fill-accent text-accent' : ''
              }`}
            />
          </Button>

          <div className="flex items-center gap-2 flex-1 max-w-xs mx-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8"
            >
              {isMuted ? (
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

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-10 w-10"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
