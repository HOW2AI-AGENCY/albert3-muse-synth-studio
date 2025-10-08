import { Play, Pause, SkipBack, SkipForward, Minimize2, Volume2, VolumeX, Share2, Download, Heart, Repeat, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { PlayerQueue } from "./PlayerQueue";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useTrackLike } from "@/hooks/useTrackLike";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    switchToVersion,
    getAvailableVersions,
    currentVersionIndex,
  } = useAudioPlayer();

  const { vibrate } = useHapticFeedback();
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  
  // ============= ВЕРСИИ ТРЕКОВ =============
  // Получаем доступные версии для текущего трека из AudioPlayerContext
  const availableVersions = getAvailableVersions();
  const hasVersions = availableVersions.length > 1;
  
  // Always call the hook, but pass null if no currentTrack
  const { isLiked, toggleLike } = useTrackLike(
    currentTrack?.id || null, 
    0
  );

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
    toggleLike();
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={swipeRef as React.RefObject<HTMLDivElement>}
      className="fixed inset-0 z-[60] bg-gradient-to-b from-background via-background/95 to-card/90 backdrop-blur-xl animate-fade-in overflow-y-auto"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
      role="dialog"
      aria-label="Full Screen Player"
    >
      <VisuallyHidden.Root>
        <h1>Now playing: {currentTrack?.title || 'No track selected'}</h1>
      </VisuallyHidden.Root>
      <div className="flex flex-col min-h-screen p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 animate-slide-up">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="h-10 w-10 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-10 w-10 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            {hasVersions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-primary/10 hover:scale-105 transition-all duration-200">
                    <Repeat className="h-5 w-5" />
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-gradient-primary animate-pulse">
                      {availableVersions.length}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-primary/20 shadow-glow z-[100]">
                  {availableVersions.map((version, idx) => (
                    <DropdownMenuItem
                      key={version.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        vibrate('light');
                        switchToVersion(version.id);
                      }}
                      className={`hover:bg-primary/10 transition-colors ${currentVersionIndex === idx ? 'bg-primary/20' : ''}`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="flex-1">
                          {version.versionNumber === 0 ? 'Оригинал' : `Версия ${version.versionNumber}`}
                        </span>
                        {version.isMasterVersion && (
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 animate-pulse" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <PlayerQueue />
          </div>
        </div>

        {/* Album Art */}
        <div className="flex-1 flex items-center justify-center mb-6 sm:mb-8 px-4">
          <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-glow-primary animate-scale-in hover:scale-105 transition-transform duration-500">
            {currentTrack.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-primary animate-pulse" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        </div>

        {/* Track Info */}
        <div className="text-center mb-4 sm:mb-6 px-4 animate-slide-up">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gradient-primary line-clamp-2 animate-shimmer">
              {currentTrack.title}
            </h2>
            {/* Индикатор текущей версии */}
            {hasVersions && currentVersionIndex > 0 && (
              <Badge variant="secondary" className="text-sm">
                V{currentVersionIndex + 1}
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground/80 truncate">
            {currentTrack.style_tags?.join(' • ') || 'AI Generated'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-2 px-4 animate-slide-up">
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full cursor-pointer hover:scale-y-110 transition-transform duration-200"
          />
          <div className="flex justify-between text-xs text-muted-foreground/80 mt-2 font-medium tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-6 px-4 animate-slide-up">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="h-12 w-12 sm:h-14 sm:w-14 hover:bg-primary/10 hover:scale-110 transition-all duration-200"
          >
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            size="icon"
            onClick={handlePlayPause}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-primary hover:shadow-glow-primary hover:scale-110 transition-all duration-200"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 sm:h-10 sm:w-10" fill="currentColor" />
            ) : (
              <Play className="h-8 w-8 sm:h-10 sm:w-10 ml-1" fill="currentColor" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-12 w-12 sm:h-14 sm:w-14 hover:bg-primary/10 hover:scale-110 transition-all duration-200"
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 px-4 animate-slide-up">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className={`h-10 w-10 hover:scale-110 transition-all duration-200 ${
              isLiked ? 'text-accent hover:bg-accent/10' : 'hover:bg-primary/10'
            }`}
          >
            <Heart
              className={`h-5 w-5 transition-all duration-200 ${
                isLiked ? 'fill-accent text-accent animate-pulse' : ''
              }`}
            />
          </Button>

          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs mx-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
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
              className="flex-1 hover:scale-y-110 transition-transform duration-200"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-10 w-10 hover:bg-primary/10 hover:scale-110 transition-all duration-200"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
