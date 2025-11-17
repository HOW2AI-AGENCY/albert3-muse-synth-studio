import { memo, useCallback, useMemo, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, X } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UnifiedTrackActionsMenu } from "@/components/tracks/shared/TrackActionsMenu.unified";
import { useTrackVersionLike } from "@/features/tracks/hooks/useTrackVersionLike";
import { useDownloadTrack } from "@/hooks/useDownloadTrack";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  const availableVersions = useAudioPlayerStore((state) => state.availableVersions);
  const currentVersionIndex = useAudioPlayerStore((state) => state.currentVersionIndex);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);

  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);

  const { vibrate } = useHapticFeedback();
  
  const currentVersionId = useMemo(() => {
    if (!currentTrack) return null;
    return availableVersions[currentVersionIndex]?.id || currentTrack.id;
  }, [currentTrack, availableVersions, currentVersionIndex]);
  
  const { isLiked, toggleLike } = useTrackVersionLike(currentVersionId, 0);
  const { downloadTrack } = useDownloadTrack();

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

  const handleClose = useCallback(() => {
    vibrate('medium');
    clearCurrentTrack();
  }, [clearCurrentTrack, vibrate]);

  const handleDownloadClick = useCallback(() => {
    if (!currentTrack?.audio_url) return;
    downloadTrack({
      id: currentVersionId || currentTrack.id,
      title: currentTrack.title,
      audio_url: currentTrack.audio_url,
    });
  }, [currentTrack, currentVersionId, downloadTrack]);

  if (!currentTrack) return null;

  return (
    <div
      data-testid="mini-player"
      className="fixed left-0 right-0 bg-gradient-to-t from-background/98 via-card/95 to-card/90 backdrop-blur-2xl border-t border-border/40 shadow-[0_-4px_24px_-8px_hsl(var(--primary)/0.15)] transition-all duration-300"
      style={{
        bottom: 'calc(var(--bottom-tab-bar-height, 0px) + env(safe-area-inset-bottom))',
        zIndex: 'var(--z-mini-player)'
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-border/30">
        <div 
          className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 transition-all duration-300"
          style={{ 
            width: `${(useAudioPlayerStore.getState().currentTime / (useAudioPlayerStore.getState().duration || 1)) * 100}%` 
          }}
        />
      </div>

      <div 
        className="flex flex-col gap-2 px-4 py-3 touch-target-comfortable animate-fade-in"
        onClick={handleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={currentTrack.cover_url || '/placeholder.svg'}
              alt={currentTrack.title}
              className={cn(
                "w-12 h-12 rounded-lg object-cover shadow-lg ring-1 ring-white/10 transition-all duration-300",
                isPlaying && "ring-2 ring-primary/50 shadow-primary/20"
              )}
            />
            {isPlaying && (
              <div className="absolute inset-0 rounded-lg bg-primary/10 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-white rounded-full animate-pulse"
                      style={{
                        height: '12px',
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '0.6s'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold text-sm leading-tight truncate mb-0.5 text-foreground">
              {currentTrack.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">
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

          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePrevious}
              className="h-8 w-8 hover:bg-primary/10 transition-all"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="default"
              onClick={handlePlayPause}
              className="h-9 w-9 rounded-full shadow-lg hover:scale-105 transition-all bg-primary hover:bg-primary/90"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleNext}
              className="h-8 w-8 hover:bg-primary/10 transition-all"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {availableVersions.length > 1 && (
              <DropdownMenu open={isVersionMenuOpen} onOpenChange={setIsVersionMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:bg-primary/10 transition-all relative"
                  >
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      V{currentVersionIndex + 1}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[120px]">
                  {availableVersions.map((version, idx) => (
                    <DropdownMenuItem
                      key={version.id}
                      onClick={() => {
                        switchToVersion(version.id);
                        setIsVersionMenuOpen(false);
                      }}
                      className={cn(
                        "gap-2",
                        currentVersionIndex === idx && "bg-primary/10"
                      )}
                    >
                      <span>Version {version.versionNumber || idx + 1}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <UnifiedTrackActionsMenu
              trackId={currentTrack.id}
              trackStatus={currentTrack.status || 'completed'}
              isLiked={isLiked}
              onLike={toggleLike}
              onDownload={handleDownloadClick}
              onShare={() => {}}
              onDelete={() => {
                clearCurrentTrack();
                toast.success('Трек удален');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

MiniPlayer.displayName = 'MiniPlayer';
