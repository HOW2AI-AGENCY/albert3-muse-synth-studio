import { memo, useState, useCallback, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, Minimize2, Volume2, VolumeX, Share2, Download, Heart, Repeat, Star } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { PlayerQueue } from "./PlayerQueue";
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying, useVolume } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useTrackLike } from "@/features/tracks";
import { useToast } from "@/hooks/use-toast";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logger } from "@/utils/logger";
import { LyricsDisplay } from './LyricsDisplay'; // Import LyricsDisplay

interface FullScreenPlayerProps {
  onMinimize: () => void;
}

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const FullScreenPlayer = memo(({ onMinimize }: FullScreenPlayerProps) => {
  // ✅ Zustand store with optimized selectors
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const volume = useVolume();
  
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const duration = useAudioPlayerStore((state) => state.duration);
  const bufferingProgress = useAudioPlayerStore((state) => state.bufferingProgress);
  const availableVersions = useAudioPlayerStore((state) => state.availableVersions);
  const currentVersionIndex = useAudioPlayerStore((state) => state.currentVersionIndex);
  
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const setVolume = useAudioPlayerStore((state) => state.setVolume);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const playPrevious = useAudioPlayerStore((state) => state.playPrevious);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);

  const { vibrate } = useHapticFeedback();
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  
  // ============= ВЕРСИИ ТРЕКОВ =============
  const hasVersions = useMemo(() => availableVersions.length > 1, [availableVersions]);
  
  // Always call the hook, but pass null if no currentTrack
  const { isLiked, toggleLike } = useTrackLike(
    currentTrack?.id ?? "", 
    0
  );

  const handlePlayPause = useCallback(() => {
    vibrate('light');
    togglePlayPause();
  }, [vibrate, togglePlayPause]);

  const handleNext = useCallback(() => {
    vibrate('light');
    playNext();
  }, [vibrate, playNext]);

  const handlePrevious = useCallback(() => {
    vibrate('light');
    playPrevious();
  }, [vibrate, playPrevious]);

  const handleSeek = useCallback((value: number[]) => {
    seekTo(value[0]);
  }, [seekTo]);

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  }, [setVolume]);

  const toggleMute = useCallback(() => {
    vibrate('light');
    if (isMuted) {
      setVolume(0.5);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  }, [vibrate, isMuted, setVolume]);

  const handleShare = useCallback(async () => {
    vibrate('light');
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack?.title || '', // Use optional chaining for currentTrack
          text: `Слушай этот трек: ${currentTrack?.title || ''}`, // Use optional chaining
          url: window.location.href,
        });
      } catch (error) {
        logger.error('Error sharing', error instanceof Error ? error : new Error(String(error)), 'FullScreenPlayer');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Ссылка скопирована",
        description: "Ссылка на трек скопирована в буфер обмена",
      });
    }
  }, [vibrate, currentTrack?.title, toast]); // Add currentTrack to dependencies

  const handleDownload = useCallback(() => {
    vibrate('medium');
    if (currentTrack?.audio_url) { // Use optional chaining
      window.open(currentTrack.audio_url, '_blank');
    }
  }, [vibrate, currentTrack?.audio_url]); // Add currentTrack to dependencies

  const handleLike = useCallback(() => {
    vibrate(isLiked ? 'light' : 'success');
    toggleLike();
  }, [vibrate, isLiked, toggleLike]);

  const swipeRef = useSwipeGesture({
    onSwipeDown: useCallback(() => {
      vibrate('medium');
      onMinimize();
    }, [vibrate, onMinimize]),
  });

  if (!currentTrack) return null;

  // const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={swipeRef as React.RefObject<HTMLDivElement>}
      className="fixed inset-0 bg-gradient-to-b from-background via-background/95 to-card/90 backdrop-blur-xl animate-fade-in overflow-y-auto touch-optimized"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 'var(--z-fullscreen-player)'
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
                          V{version.versionNumber || idx + 1}
                        </span>
                        {version.isMasterVersion && (
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500 animate-pulse" />
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
          <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-glow-primary animate-scale-in hover:scale-105 transition-all duration-500 group">
            {currentTrack.cover_url ? (
              <img
                key={currentTrack.id}
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover animate-fade-in"
              />
            ) : (
              <div className="w-full h-full bg-gradient-primary animate-pulse" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent group-hover:from-black/30 transition-colors duration-300" />
            {isPlaying && (
              <div className="absolute inset-0 border-4 border-primary/40 rounded-3xl animate-pulse" />
            )}
          </div>
        </div>

        {/* Track Info */}
        <div className="text-center mb-4 sm:mb-6 px-4 animate-slide-up" key={currentTrack.id}>
          <div className="flex items-center justify-center gap-2 mb-2 animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-bold text-gradient-primary line-clamp-2 transition-all duration-300">
              {currentTrack.title}
            </h2>
            {/* Индикатор текущей версии */}
            {hasVersions && (
              <Badge variant="secondary" className="text-sm animate-scale-in">
                V{currentTrack.versionNumber ?? currentVersionIndex + 1}
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground/80 truncate animate-fade-in transition-opacity duration-300">
            {currentTrack.style_tags?.join(' • ') || 'AI Generated'}
          </p>
        </div>

        {/* Lyrics Display for Mobile */}
        {currentTrack.suno_task_id && currentTrack.id && (
          <div className="mb-4 px-4 animate-fade-in">
            <LyricsDisplay taskId={currentTrack.suno_task_id} audioId={currentTrack.id} />
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-2 px-4 animate-slide-up">
          <div className="relative">
            {/* Buffering progress indicator */}
            {bufferingProgress > 0 && bufferingProgress < 100 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-primary/30 rounded-full transition-all duration-300 pointer-events-none"
                style={{ width: `${bufferingProgress}%` }}
              >
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
            )}
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full cursor-pointer hover:scale-y-110 transition-transform duration-200"
            />
          </div>
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
});

FullScreenPlayer.displayName = 'FullScreenPlayer';
