import { memo, useCallback, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, X, List, Star } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveStack } from "@/components/ui/ResponsiveLayout";
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getVersionLabel } from "@/utils/versionLabels";
import { cn } from "@/lib/utils";

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer = memo(({ onExpand }: MiniPlayerProps) => {
  // ✅ Zustand store with optimized selectors
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const playPrevious = useAudioPlayerStore((state) => state.playPrevious);
  const queue = useAudioPlayerStore((state) => state.queue);
  const currentQueueIndex = useAudioPlayerStore((state) => state.currentQueueIndex);
  const clearCurrentTrack = useAudioPlayerStore((state) => state.clearCurrentTrack);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);
  const availableVersions = useAudioPlayerStore((state) => state.availableVersions);
  const currentVersionIndex = useAudioPlayerStore((state) => state.currentVersionIndex);
  
  const { vibrate } = useHapticFeedback();

  // ✅ All hooks must be called before any conditional returns
  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('light');
    togglePlayPause();
  }, [togglePlayPause, vibrate]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('medium');
    playNext();
  }, [playNext, vibrate]);

  const handlePrevious = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('medium');
    playPrevious();
  }, [playPrevious, vibrate]);

  const handleExpand = useCallback(() => {
    vibrate('medium');
    onExpand();
  }, [onExpand, vibrate]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('medium');
    clearCurrentTrack();
  }, [clearCurrentTrack, vibrate]);

  // Versions
  const hasVersions = useMemo(() => availableVersions.length > 1, [availableVersions]);

  // ✅ Conditional return after all hooks
  if (!currentTrack) return null;

  return (
    <div
      data-testid="mini-player"
      onClick={handleExpand}
      className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/30 shadow-lg cursor-pointer animate-slide-up safe-area-bottom-md hover:bg-card/90 transition-all duration-300 pt-[var(--mobile-spacing-sm)] md:pt-[var(--mobile-spacing-md)]" /* Updated styling for glassmorphism with unified safe-area */
      style={{
        zIndex: 'var(--z-mini-player)' /* Use unified z-index system from design-tokens.css */
      }}
    >
      <ResponsiveStack
        direction="horizontal"
        spacing="sm"
        align="center"
        className="p-2 md:p-3"
      >
        {/* Album Art */}
        <div className={cn(
          "relative rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 group",
          "w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14"
        )}>
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/30 transition-colors duration-300" />
          {isPlaying && (
            <div className="absolute inset-0 border-2 border-primary/50 rounded-xl animate-pulse" />
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0 animate-fade-in" key={currentTrack.id}>
          <h4 className="text-sm font-semibold text-foreground truncate transition-all duration-300 hover:text-primary">
            {currentTrack.title.replace(/\s*\(V\d+\)$/i, '')}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/80 transition-opacity duration-300">
            <span className="truncate">
              {currentTrack.style_tags?.[0] || 'AI Generated'}
            </span>
            {queue.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 animate-fade-in">
                  <List className="h-3 w-3 animate-pulse" />
                  {currentQueueIndex + 1}/{queue.length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
          {/* Phase 2.3: Versions Sheet для мобильных */}
          {hasVersions && (
            <Sheet>
              <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="icon-button-touch relative hover:bg-primary/10 hover:scale-105 transition-all duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <List className="h-4 w-4" />
                  <Badge className="absolute -top-1 -right-1 h-3.5 w-3.5 p-0 flex items-center justify-center text-[9px] bg-gradient-primary">
                    {availableVersions.length}
                  </Badge>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-card/95 backdrop-blur-xl border-primary/20">
                <SheetHeader>
                  <SheetTitle>Версии трека</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
                  {availableVersions.map((version, idx) => (
                    <Button
                      key={version.id}
                      variant={currentVersionIndex === idx ? "default" : "outline"}
                      size="lg"
                      className="w-full justify-start"
                      onClick={() => {
                        switchToVersion(version.id);
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {version.isMasterVersion && (
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        )}
                        <span className="flex-1 text-left">
                          {getVersionLabel({
                            versionNumber: version.versionNumber,
                            isMaster: version.isMasterVersion,
                          })}
                        </span>
                        {currentVersionIndex === idx && (
                          <Play className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePrevious}
                className="icon-button-touch hover:bg-primary/10 hover:scale-105 transition-all duration-200"
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
                className="h-12 w-12 min-h-[48px] min-w-[48px] sm:h-14 sm:w-14 sm:min-h-[56px] sm:min-w-[56px] rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all duration-200 active:scale-95 touch-optimized"
                style={{ willChange: 'transform' }}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" />
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
                className="icon-button-touch hover:bg-primary/10 hover:scale-105 transition-all duration-200"
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
                className="icon-button-touch hover:bg-destructive/20 hover:scale-105 transition-all duration-200"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Закрыть плеер</TooltipContent>
          </Tooltip>
        </div>
      </ResponsiveStack>
    </div>
  );
});

MiniPlayer.displayName = 'MiniPlayer';
