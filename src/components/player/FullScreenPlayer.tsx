import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Minimize2, Volume2, VolumeX, Share2, Download, Heart, Repeat, Star, Eye, EyeOff } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { PlayerQueue } from "./PlayerQueue";
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying, useVolume } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useTrackLike } from "@/features/tracks";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logger } from "@/utils/logger";
import { MobileProgressBar } from './mobile/MobileProgressBar';
import { LyricsDisplay } from './LyricsDisplay';
import { cn } from "@/lib/utils";

interface FullScreenPlayerProps {
  onMinimize: () => void;
}

export const FullScreenPlayer = memo(({ onMinimize }: FullScreenPlayerProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const volume = useVolume();

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
  const [showLyrics, setShowLyrics] = useState(true);

  useEffect(() => {
    const shouldBeMuted = volume === 0;
    if (isMuted !== shouldBeMuted) {
      setIsMuted(shouldBeMuted);
    }
  }, [volume, isMuted]);

  const hasVersions = useMemo(() => availableVersions.length > 1, [availableVersions]);
  
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
          title: currentTrack?.title || '',
          text: `Слушай этот трек: ${currentTrack?.title || ''}`,
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
  }, [vibrate, currentTrack, toast]);

  const handleDownload = useCallback(() => {
    vibrate('light');
    if (currentTrack?.audio_url) {
      const link = document.createElement('a');
      link.href = currentTrack.audio_url;
      link.download = `${currentTrack.title || 'track'}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Загрузка началась",
        description: "Трек скачивается на устройство",
      });
    }
  }, [vibrate, currentTrack, toast]);

  const handleLike = useCallback(() => {
    vibrate('light');
    toggleLike();
  }, [vibrate, toggleLike]);

  const toggleLyricsVisibility = useCallback(() => {
    vibrate('light');
    setShowLyrics(prev => !prev);
  }, [vibrate]);

  const swipeRef = useSwipeGesture({
    onSwipeDown: useCallback(() => {
      vibrate('medium');
      onMinimize();
    }, [vibrate, onMinimize]),
  });

  if (!currentTrack) return null;

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
      aria-label="Полноэкранный плеер"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 touch-target-comfortable">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              vibrate('medium');
              onMinimize();
            }}
            className="h-10 w-10 md:h-11 md:w-11 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] hover:bg-primary/10 hover:scale-105 transition-all duration-200"
            aria-label="Свернуть плеер"
          >
            <Minimize2 className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLyricsVisibility}
            className={`h-10 w-10 md:h-11 md:w-11 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] hover:scale-105 transition-all duration-200 ${
              showLyrics ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10'
            }`}
            aria-label={showLyrics ? "Скрыть текст" : "Показать текст"}
          >
            {showLyrics ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>

          <div className="flex items-center gap-1.5 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-10 w-10 md:h-11 md:w-11 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] hover:bg-primary/10 hover:scale-105 transition-all duration-200"
              aria-label="Поделиться"
            >
              <Share2 className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            {hasVersions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-11 w-11 min-h-[44px] min-w-[44px] hover:bg-primary/10 hover:scale-105 transition-all duration-200">
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
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col items-center justify-start px-3 md:px-6 py-4 md:py-8 overflow-y-auto">
        {/* Album Art */}
        <div className="relative w-full max-w-[280px] md:max-w-sm aspect-square mb-4 md:mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent rounded-3xl blur-3xl opacity-60 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-primary/20 rounded-3xl blur-2xl" />
          
          <img
            src={currentTrack?.cover_url || '/placeholder.svg'}
            alt={currentTrack?.title || 'Track'}
            className={cn(
              "relative w-full h-full object-cover rounded-3xl shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.4)]",
              "ring-1 ring-white/10 transition-all duration-500",
              isPlaying && "scale-[1.02] shadow-[0_12px_48px_-12px_hsl(var(--primary)/0.6)]"
            )}
          />
          
          {isPlaying && (
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-sm flex items-center gap-2 shadow-lg">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white">Playing</span>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="text-center px-3 md:px-4 mb-4 md:mb-6 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-1.5 md:mb-2">
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gradient-primary line-clamp-2 transition-all duration-300">
              {currentTrack.title}
            </h2>
            {hasVersions && (
              <Badge variant="secondary" className="text-xs md:text-sm animate-scale-in">
                V{currentTrack.versionNumber ?? currentVersionIndex + 1}
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm lg:text-base text-muted-foreground/80 truncate transition-opacity duration-300">
            {currentTrack.style_tags?.join(' • ') || 'AI Generated'}
          </p>
        </div>

        {/* Lyrics */}
        {showLyrics && currentTrack?.suno_task_id && currentTrack?.suno_id && (
          <div className="flex-1 w-full overflow-hidden mb-3 md:mb-6">
            <LyricsDisplay
              taskId={currentTrack.suno_task_id}
              audioId={currentTrack.suno_id}
              fallbackLyrics={currentTrack.lyrics}
            />
          </div>
        )}

        {/* Progress */}
        <MobileProgressBar onSeek={handleSeek} className="w-full mb-4 md:mb-6" />

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-3 md:gap-4 lg:gap-8 mb-4 md:mb-6 animate-slide-up">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="h-11 w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 hover:bg-primary/10 hover:scale-110 transition-all duration-200 touch-manipulation"
          >
            <SkipBack className="h-5 w-5 md:h-6 md:w-6" />
          </Button>

          <Button
            size="icon"
            onClick={handlePlayPause}
            className="h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 rounded-full bg-gradient-primary hover:shadow-glow-primary hover:scale-110 transition-all duration-200 touch-manipulation"
          >
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
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
        <div className="flex items-center justify-between mb-4 sm:mb-6 px-4 animate-slide-up w-full max-w-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className={`h-11 w-11 min-h-[44px] min-w-[44px] hover:scale-110 transition-all duration-200 ${
              isLiked ? 'text-accent hover:bg-accent/10' : 'hover:bg-primary/10'
            }`}
          >
            <Heart className={`h-5 w-5 transition-all duration-200 ${isLiked ? 'fill-accent text-accent animate-pulse' : ''}`} />
          </Button>

          <div className="flex items-center gap-2 flex-1 max-w-xs mx-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
            >
              {isMuted ? <VolumeX className="h-5 w-5 sm:h-4 sm:w-4" /> : <Volume2 className="h-5 w-5 sm:h-4 sm:w-4" />}
            </Button>
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="flex-1 hover:scale-y-110 transition-transform duration-200 touch-optimized"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-11 w-11 min-h-[44px] min-w-[44px] hover:bg-primary/10 hover:scale-110 transition-all duration-200"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

FullScreenPlayer.displayName = 'FullScreenPlayer';
