import { memo, useCallback, useMemo, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, X, MoreVertical, List, Star, Heart } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getVersionLabel } from "@/utils/versionLabels";
import { cn } from "@/lib/utils";
import { useTrackVersionLike } from "@/features/tracks/hooks/useTrackVersionLike";

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer = memo(({ onExpand }: MiniPlayerProps) => {
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
  
  // Like functionality для текущей версии
  const currentVersionId = useMemo(() => {
    if (!currentTrack) return null;
    return availableVersions[currentVersionIndex]?.id || currentTrack.id;
  }, [currentTrack, availableVersions, currentVersionIndex]);
  
  const { isLiked, toggleLike } = useTrackVersionLike(
    currentVersionId,
    0 // Initial like count - будет обновлен через realtime subscription
  );

  const [isVersionsSheetOpen, setIsVersionsSheetOpen] = useState(false);

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

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('light');
    toggleLike();
  }, [toggleLike, vibrate]);

  const hasVersions = useMemo(() => availableVersions.length > 1, [availableVersions]);

  if (!currentTrack) return null;

  return (
    <div
      data-testid="mini-player"
      className="fixed left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl transition-all duration-300"
      style={{
        bottom: 'calc(var(--bottom-tab-bar-height, 0px) + env(safe-area-inset-bottom))',
        zIndex: 'var(--z-mini-player)'
      }}
    >
      {/* Компактный плеер - современный дизайн */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Album Art - кликабельно для expand */}
        <div 
          onClick={handleExpand}
          className={cn(
            "relative rounded-md overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group",
            "w-12 h-12"
          )}
        >
          {currentTrack.cover_url ? (
            <img
              key={currentTrack.id}
              src={currentTrack.cover_url}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary animate-pulse" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/30 transition-colors duration-300" />
          {isPlaying && (
            <div className="absolute inset-0 border-2 border-primary/50 rounded-md animate-pulse" />
          )}
        </div>

        {/* Track Info - кликабельно для expand */}
        <div 
          onClick={handleExpand}
          className="flex-1 min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-foreground truncate max-w-[180px] sm:max-w-none">
              {currentTrack.title.replace(/\s*\(V\d+\)$/i, '')}
            </h4>
            {hasVersions && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 flex-shrink-0">
                V{currentTrack.versionNumber ?? currentVersionIndex + 1}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
            <span className="truncate max-w-[150px] sm:max-w-none">
              {currentTrack.style_tags?.slice(0, 2).join(' • ') || 'AI Generated'}
            </span>
            {queue.length > 0 && (
              <>
                <span className="opacity-50">•</span>
                <span className="flex-shrink-0">{currentQueueIndex + 1}/{queue.length}</span>
              </>
            )}
          </div>
        </div>

        {/* Playback Controls - компактные */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Previous - только на tablet+ */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePrevious}
            className="h-9 w-9 hidden sm:inline-flex hover:bg-primary/10 transition-all"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause - главная кнопка */}
          <Button
            size="icon"
            variant="default"
            onClick={handlePlayPause}
            className="h-10 w-10 rounded-full shadow-lg hover:scale-105 transition-all bg-primary hover:bg-primary/90"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          {/* Next */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleNext}
            className="h-9 w-9 hover:bg-primary/10 transition-all"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Context Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 hidden xs:inline-flex hover:bg-primary/10 transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleLike}>
                <Heart className={cn("h-4 w-4 mr-2", isLiked && "fill-red-500 text-red-500")} />
                {isLiked ? 'Убрать из избранного' : 'Добавить в избранное'}
              </DropdownMenuItem>
              
              {hasVersions && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setIsVersionsSheetOpen(true);
                }}>
                  <List className="h-4 w-4 mr-2" />
                  Версии ({availableVersions.length})
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={handleExpand}>
                <Play className="h-4 w-4 mr-2" />
                Открыть полный плеер
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleClose} className="text-destructive">
                <X className="h-4 w-4 mr-2" />
                Закрыть плеер
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close Button - всегда видна */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Versions Sheet */}
      {hasVersions && (
        <Sheet open={isVersionsSheetOpen} onOpenChange={setIsVersionsSheetOpen}>
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
                    setIsVersionsSheetOpen(false);
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
    </div>
  );
});

MiniPlayer.displayName = 'MiniPlayer';

