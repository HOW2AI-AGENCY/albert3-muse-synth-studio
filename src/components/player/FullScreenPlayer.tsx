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
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logger } from "@/utils/logger";
import TimestampedLyricsDisplay from '@/components/lyrics/TimestampedLyricsDisplay';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileProgressBar } from './mobile/MobileProgressBar';
import { LyricsSkeleton } from "./LyricsSkeleton";

interface FullScreenPlayerProps {
  onMinimize: () => void;
}

export const FullScreenPlayer = memo(({ onMinimize }: FullScreenPlayerProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const volume = useVolume();
  const currentTime = useAudioPlayerStore((state) => state.currentTime);

  const availableVersions = useAudioPlayerStore((state) => state.availableVersions);
  const currentVersionIndex = useAudioPlayerStore((state) => state.currentVersionIndex);

  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const setVolume = useAudioPlayerStore((state) => state.setVolume);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const playPrevious = useAudioPlayerStore((state) => state.playPrevious);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);

  const { data: lyricsData, isLoading } = useTimestampedLyrics({
    taskId: currentTrack?.suno_task_id,
    audioId: currentTrack?.id,
    enabled: !!(currentTrack?.suno_task_id && currentTrack?.id),
  });

  const { vibrate } = useHapticFeedback();
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);

  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const shouldBeMuted = volume === 0;
    if (isMuted !== shouldBeMuted) {
      setIsMuted(shouldBeMuted);
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (lyricsData?.hootCer && lyricsData.hootCer > 0.3) {
      toast({
        title: "Низкое качество синхронизации",
        description: "Синхронизация текста для этого трека может быть неточной.",
        variant: "destructive",
      });
    }
  }, [lyricsData, toast]);

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
  }, [vibrate, currentTrack?.title, toast]);

  const handleDownload = useCallback(() => {
    vibrate('medium');
    if (currentTrack?.audio_url) {
      const a = document.createElement('a');
      a.href = currentTrack.audio_url;
      a.download = `${currentTrack.title}.mp3`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: "Скачивание начато",
        description: `Скачивание "${currentTrack.title}"`,
      });
    }
  }, [vibrate, currentTrack?.audio_url, currentTrack?.title, toast]);

  const handleLike = useCallback(() => {
    vibrate(isLiked ? 'light' : 'success');
    toggleLike();
  }, [vibrate, isLiked, toggleLike]);

  const swipeRef = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrevious,
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
      aria-label="Full Screen Player"
    >
      <VisuallyHidden.Root>
        <h1>Now playing: {currentTrack?.title || 'No track selected'}</h1>
      </VisuallyHidden.Root>
      <div className="flex flex-col min-h-screen p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8 animate-slide-up">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="h-11 w-11 min-h-[44px] min-w-[44px] hover:bg-primary/10 hover:scale-105 transition-all duration-200"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            {lyricsData?.alignedWords && lyricsData.alignedWords.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  vibrate('light');
                  setShowLyrics(!showLyrics);
                }}
                className="h-11 w-11 min-h-[44px] min-w-[44px] hover:bg-primary/10 hover:scale-105 transition-all duration-200"
              >
                {showLyrics ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-11 w-11 min-h-[44px] min-w-[44px] hover:bg-primary/10 hover:scale-105 transition-all duration-200"
            >
              <Share2 className="h-5 w-5" />
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

        <div className="text-center mb-4 sm:mb-6 px-4 animate-slide-up" key={currentTrack.id}>
          <div className="flex items-center justify-center gap-2 mb-2 animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-bold text-gradient-primary line-clamp-2 transition-all duration-300">
              {currentTrack.title}
            </h2>
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

        {showLyrics && (
          <div className="mb-4 animate-fade-in max-h-64 h-64 flex items-center justify-center">
            {isLoading ? (
              <LyricsSkeleton className="w-full" />
            ) : (
              lyricsData?.alignedWords && lyricsData.alignedWords.length > 0 && (
                <TimestampedLyricsDisplay
                  lyricsData={lyricsData.alignedWords}
                  currentTime={currentTime}
                  className="h-64"
                />
              )
            )}
          </div>
        )}

        <MobileProgressBar
          onSeek={handleSeek}
          className="mb-2 px-4 animate-slide-up"
        />

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

        <div className="flex items-center justify-between mb-4 sm:mb-6 px-4 animate-slide-up">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className={`h-11 w-11 min-h-[44px] min-w-[44px] hover:scale-110 transition-all duration-200 ${
              isLiked ? 'text-accent hover:bg-accent/10' : 'hover:bg-primary/10'
            }`}
          >
            <Heart
              className={`h-5 w-5 transition-all duration-200 ${
                isLiked ? 'fill-accent text-accent animate-pulse' : ''
              }`}
            />
          </Button>

          <div className="flex items-center gap-2 flex-1 max-w-xs mx-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 sm:h-4 sm:w-4" />
              ) : (
                <Volume2 className="h-5 w-5 sm:h-4 sm:w-4" />
              )}
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
