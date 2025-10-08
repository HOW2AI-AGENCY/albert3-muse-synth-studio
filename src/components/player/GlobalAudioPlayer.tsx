import { useState, useEffect, useRef } from "react";
import { MiniPlayer } from "./MiniPlayer";
import { FullScreenPlayer } from "./FullScreenPlayer";
import { PlayerQueue } from "./PlayerQueue";
import { LoadingSkeleton } from "../ui/LoadingSkeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatTime } from "@/utils/formatters";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Music, X, Star, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

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
    switchToVersion,
    getAvailableVersions,
    currentVersionIndex,
    clearCurrentTrack,
  } = useAudioPlayer();
  
  // ============= ВЕРСИИ ТРЕКОВ =============
  const availableVersions = getAvailableVersions();
  const hasVersions = availableVersions.length > 1;

  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [isVisible, setIsVisible] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  // Анимация появления плеера
  useEffect(() => {
    if (currentTrack) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [currentTrack]);

  // Keyboard shortcuts for desktop only
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea or on mobile
      if (isMobile || ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

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
    <TooltipProvider delayDuration={500}>
    <div 
      ref={playerRef}
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0'
      }`}
    >
      {/* Фоновый блюр и градиент */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/90 to-background/80 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      
      {/* Верхняя граница с эффектом свечения */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-primary/80 shadow-glow-primary animate-pulse" />
      
      <div className="relative container mx-auto px-4 py-4">
        <div className="flex items-center gap-6">
          {/* Track Info */}
          <div className="flex items-center gap-4 min-w-0 flex-1 max-w-xs">
            <div className="relative group">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                {currentTrack.cover_url ? (
                  <img
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-primary animate-pulse flex items-center justify-center">
                    <Music className="h-6 w-6 text-white/80" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Индикатор воспроизведения */}
                {isPlaying && (
                  <div className="absolute bottom-2 right-2">
                    <div className="flex items-center gap-0.5">
                      <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm truncate text-foreground hover:text-primary transition-colors duration-200">
                  {currentTrack.title}
                </h4>
                {/* Индикатор текущей версии */}
                {hasVersions && currentVersionIndex > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    V{currentVersionIndex + 1}
                  </Badge>
                )}
              </div>
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
          <div className="flex flex-col items-center gap-3 flex-1 max-w-2xl">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={playPrevious}
                title="Предыдущий трек (←)"
                className="h-10 w-10 hover:bg-primary/10 hover:scale-110 transition-all duration-200 group"
              >
                <SkipBack className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
              </Button>

              <Button
                size="icon"
                variant="default"
                onClick={togglePlayPause}
                title={isPlaying ? "Пауза (Space)" : "Воспроизвести (Space)"}
                className="h-14 w-14 rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all duration-300 hover:scale-110 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {isPlaying ? (
                  <Pause className="h-7 w-7 relative z-10" />
                ) : (
                  <Play className="h-7 w-7 ml-0.5 relative z-10" />
                )}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={playNext}
                title="Следующий трек (→)"
                className="h-10 w-10 hover:bg-primary/10 hover:scale-110 transition-all duration-200 group"
              >
                <SkipForward className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
              </Button>

              {/* Версии трека */}
              {hasVersions && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="relative h-10 w-10 hover:bg-primary/10 hover:scale-110 transition-all duration-200"
                          title={`${availableVersions.length} версий`}
                        >
                          <List className="h-5 w-5" />
                          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-gradient-primary">
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
                              switchToVersion(version.id);
                            }}
                            className={`hover:bg-primary/10 transition-colors ${currentVersionIndex === idx ? 'bg-primary/20' : ''}`}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <span className="flex-1">
                                {version.versionNumber === 0 ? 'Оригинал' : `Версия ${version.versionNumber}`}
                              </span>
                              {version.isMasterVersion && (
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Версии трека ({availableVersions.length})</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <PlayerQueue />
            </div>

            {/* Progress Bar */}
            <div className="w-full flex items-center gap-4">
              <span className="text-xs font-medium text-foreground/80 tabular-nums min-w-[40px]">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative group">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  aria-label="Seek progress"
                  onValueChange={(value) => seekTo(value[0])}
                  className="cursor-pointer group-hover:scale-y-125 transition-transform duration-200"
                />
                {/* Прогресс-индикатор */}
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full -translate-y-1/2 transition-all duration-100 shadow-glow-primary"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-foreground/80 tabular-nums min-w-[40px] text-right">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume & Other Controls */}
          <div className="flex items-center gap-4">
            {/* Volume Control */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    title={isMuted ? 'Включить звук' : 'Выключить звук'}
                    className="h-10 w-10 hover:bg-primary/10 hover:scale-110 transition-all duration-200 group"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                    ) : (
                      <Volume2 className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMuted ? 'Включить звук' : 'Выключить звук'}</p>
                </TooltipContent>
              </Tooltip>
              <div className="flex-1 relative group min-w-[120px]">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  aria-label="Volume"
                  onValueChange={handleVolumeChange}
                  className="cursor-pointer group-hover:scale-y-125 transition-transform duration-200"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground/80 tabular-nums w-10 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>

            {/* Close Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={clearCurrentTrack}
                  className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive hover:scale-110 transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Закрыть плеер</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default GlobalAudioPlayer;