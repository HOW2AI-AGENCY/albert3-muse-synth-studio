import { Play, Pause, SkipBack, SkipForward, X, ListMusic, List, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveStack } from "@/components/ui/ResponsiveLayout";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer = ({ onExpand }: MiniPlayerProps) => {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlayPause, 
    playNext, 
    playPrevious, 
    queue, 
    currentQueueIndex, 
    clearCurrentTrack,
    switchToVersion,
    getAvailableVersions,
    currentVersionIndex,
  } = useAudioPlayer();
  const { vibrate } = useHapticFeedback();

  if (!currentTrack) return null;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('light');
    togglePlayPause();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('light');
    playNext();
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('light');
    playPrevious();
  };

  const handleExpand = () => {
    vibrate('medium');
    onExpand();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('medium');
    clearCurrentTrack();
  };

  // Versions
  const availableVersions = getAvailableVersions();
  const hasVersions = availableVersions.length > 1;

  return (
    <TooltipProvider delayDuration={500}>
    <div
      data-testid="mini-player"
      onClick={handleExpand}
      className="fixed bottom-0 left-0 right-0 z-[60] bg-card/95 backdrop-blur-xl border-t border-primary/20 shadow-glow cursor-pointer animate-slide-up safe-area-bottom hover:bg-card/98 transition-all duration-300"
      style={{ 
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
        paddingTop: '0.75rem'
      }}
    >
      <ResponsiveStack 
        direction="horizontal" 
        spacing="sm" 
        align="center" 
        className="p-3"
      >
        {/* Album Art */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-300">
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

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate animate-shimmer">
            {currentTrack.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
            <span className="truncate">
              {currentTrack.style_tags?.[0] || 'AI Generated'}
            </span>
            {queue.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ListMusic className="h-3 w-3" />
                  {currentQueueIndex + 1}/{queue.length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Версии трека (мини) */}
          {hasVersions && (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="relative h-8 w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
                      title={`${availableVersions.length} версий`}
                    >
                      <List className="h-4 w-4" />
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
                            {version.isOriginalVersion ? 'Оригинал' : `Версия ${version.versionNumber}`}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePrevious}
                className="h-8 w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Предыдущий трек</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="default"
                onClick={handlePlayPause}
                className="h-10 w-10 rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all duration-200 hover:scale-105"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? 'Пауза' : 'Воспроизвести'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleNext}
                className="h-8 w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Следующий трек</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleClose}
                className="h-8 w-8 hover:bg-destructive/20 hover:scale-105 transition-all duration-200"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Закрыть плеер</TooltipContent>
          </Tooltip>
        </div>
      </ResponsiveStack>
    </div>
    </TooltipProvider>
  );
};