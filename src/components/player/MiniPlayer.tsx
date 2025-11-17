import { memo, useCallback, useMemo, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, X, List, Star, VolumeX, Volume1, Volume2 } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveStack } from "@/components/ui/ResponsiveLayout";
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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

  // ✅ P2: Volume control for desktop
  const volume = useAudioPlayerStore((state) => state.volume);
  const setVolume = useAudioPlayerStore((state) => state.setVolume);

  const { vibrate } = useHapticFeedback();

  // Controlled Sheet state for versions and volume
  const [isVersionsSheetOpen, setIsVersionsSheetOpen] = useState(false);
  const [isVolumeSheetOpen, setIsVolumeSheetOpen] = useState(false);

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

  // ✅ P2: Volume control handler (simplified - no event needed, parent div handles stopPropagation)
  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
  }, [setVolume]);

  // Versions
  const hasVersions = useMemo(() => availableVersions.length > 1, [availableVersions]);

  // ✅ Conditional return after all hooks
  if (!currentTrack) return null;

  return (
    <div
      data-testid="mini-player"
      onClick={handleExpand}
      className="fixed left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl cursor-pointer animate-slide-up hover:bg-card/90 transition-all duration-300 px-3 pt-2.5"
      style={{
        bottom: 'calc(var(--bottom-tab-bar-height, 0px) + env(safe-area-inset-bottom))',
        paddingBottom: '0.75rem',
        zIndex: 'var(--z-mini-player)'
      }}
    >
      <ResponsiveStack
        direction="horizontal"
        spacing="sm"
        align="center"
        className="p-2 sm:p-2.5 md:p-3" /* P0-1 FIX: Increased from 6px to 8px mobile for better breathing room */
      >
        {/* Album Art */}
        <div className={cn(
          "relative rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 group",
          "w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16" /* P0-2 FIX: Increased from 32px to 48px mobile (Material Design minimum) */
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
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate transition-all duration-300 hover:text-primary">
              {currentTrack.title.replace(/\s*\(V\d+\)$/i, '')}
            </h4>
            {hasVersions && (
              <Badge variant="secondary" className="hidden sm:inline-flex text-xs h-5 animate-fade-in">
                V{currentTrack.versionNumber ?? currentVersionIndex + 1}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/80 transition-opacity duration-300">
            <span className="truncate">
              {currentTrack.style_tags?.join(' • ') || 'AI Generated'}
            </span>
            {queue.length > 0 && (
              <>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-1 animate-fade-in">
                  <List className="h-3 w-3" />
                  {currentQueueIndex + 1}/{queue.length}
                </span>
              </>
            )}
            {hasVersions && (
              <Badge
                variant="outline"
                className="sm:hidden text-xs h-5 animate-fade-in cursor-pointer active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  vibrate('light');
                  setIsVersionsSheetOpen(true);
                }}
              >
                V{currentTrack.versionNumber ?? currentVersionIndex + 1}
              </Badge>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0"> {/* P0-3 FIX: Increased from 4px to 8px mobile (WCAG 2.5.8 spacing) */}
          {/* Phase 2.3: Versions Sheet - Desktop button, Mobile opens via track info */}
          {hasVersions && (
            <Sheet open={isVersionsSheetOpen} onOpenChange={setIsVersionsSheetOpen}>
              <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] hidden sm:inline-flex icon-button-touch relative hover:bg-primary/10 hover:scale-105 transition-all duration-200" /* Desktop only - mobile uses track info indicator */
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
                className="h-11 w-11 min-h-[44px] min-w-[44px] hidden xs:inline-flex icon-button-touch hover:bg-primary/10 hover:scale-105 transition-all duration-200" /* P1-1 FIX: Hide on very small screens (<375px) */
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
                className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-12 sm:w-12 sm:min-h-[48px] sm:min-w-[48px] md:h-14 md:w-14 md:min-h-[56px] md:min-w-[56px] rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all duration-200 active:scale-95 touch-optimized" /* WCAG 2.1 AA compliant: 44px minimum */
                style={{ willChange: 'transform' }}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                ) : (
                  <Play className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 ml-0.5" />
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
                className="h-11 w-11 min-h-[44px] min-w-[44px] hidden xs:inline-flex icon-button-touch hover:bg-primary/10 hover:scale-105 transition-all duration-200" /* P1-1 FIX: Hide on very small screens (<375px) */
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Следующий трек</TooltipContent>
          </Tooltip>

          {/* ✅ P1-4 FIX: Volume Control - Mobile Sheet + Desktop Inline */}

          {/* Mobile Volume Icon (opens Sheet) */}
          <Sheet open={isVolumeSheetOpen} onOpenChange={setIsVolumeSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] md:hidden icon-button-touch hover:bg-primary/10 hover:scale-105 transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
                aria-label="Управление громкостью"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-card/95 backdrop-blur-xl border-primary/20">
              <SheetHeader>
                <SheetTitle>Громкость</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-4">
                <div className="flex items-center gap-4">
                  {volume === 0 ? (
                    <VolumeX className="h-6 w-6 text-muted-foreground" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-6 w-6 text-muted-foreground" />
                  )}
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="flex-1 touch-optimized"
                  />
                  <span className="text-sm font-medium tabular-nums w-12 text-center">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Volume Inline Control */}
          <div
            className="hidden md:flex items-center gap-2 ml-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  {volume === 0 ? (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="w-20">
                    <Slider
                      value={[volume]}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      className="cursor-pointer"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-8">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Громкость</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleClose}
                className="h-11 w-11 min-h-[44px] min-w-[44px] icon-button-touch hover:bg-destructive/20 hover:scale-105 transition-all duration-200"
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
