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
  
  // Like functionality для текущей версии
  const currentVersionId = useMemo(() => {
    if (!currentTrack) return null;
    return availableVersions[currentVersionIndex]?.id || currentTrack.id;
  }, [currentTrack, availableVersions, currentVersionIndex]);
  
  const { isLiked, toggleLike } = useTrackVersionLike(
    currentVersionId,
    0
  );

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
      {/* Прогресс бар сверху */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-border/30">
        <div 
          className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary transition-all duration-300"
          style={{ 
            width: `${(useAudioPlayerStore.getState().currentTime / useAudioPlayerStore.getState().duration) * 100}%` 
          }}
        />
      </div>

      {/* Компактная двухстрочная разметка */}
      <div className="px-4 py-3 space-y-3">
        {/* Строка 1: Обложка + Инфо + Кнопки управления */}
        <div className="flex items-center gap-3">
          {/* Album Art с анимацией */}
          <div
            onClick={handleExpand}
            className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <img
              src={currentTrack.cover_url || '/placeholder.svg'}
              alt={currentTrack.title}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                isPlaying ? "scale-105 brightness-105" : "scale-100"
              )}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent animate-pulse">
                <div className="absolute bottom-1 right-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))]" />
              </div>
            )}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 cursor-pointer group" onClick={handleExpand}>
            <h3 className="text-sm font-bold text-foreground truncate leading-tight mb-1 group-hover:text-primary transition-colors">
              {currentTrack.title}
            </h3>
            <div className="flex items-center gap-2">
              {currentTrack.style_tags && currentTrack.style_tags.length > 0 && (
                <div className="flex gap-1">
                  {currentTrack.style_tags.slice(0, 2).map((tag, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
              {availableVersions.length > 1 && (
                <DropdownMenu open={isVersionMenuOpen} onOpenChange={setIsVersionMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] h-4 px-1.5 flex-shrink-0 cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        vibrate('light');
                      }}
                    >
                      V{currentTrack.versionNumber ?? currentVersionIndex + 1}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[200px]">
                    {availableVersions.map((version, idx) => (
                      <DropdownMenuItem
                        key={version.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          vibrate('light');
                          switchToVersion(version.id);
                          setIsVersionMenuOpen(false);
                        }}
                        className={cn(
                          "cursor-pointer",
                          currentVersionIndex === idx && "bg-primary/10 font-medium"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>Версия {idx + 1}</span>
                          {currentVersionIndex === idx && (
                            <span className="text-xs text-primary">●</span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
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

          {/* Кнопка закрытия */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Строка 2: Действия */}
        <div className="flex items-center justify-between gap-2">
          {/* Playback Controls */}
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
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
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

          {/* Unified Actions Menu - Direct Component (No Extra Dropdown) */}
          <div className="flex items-center gap-1">
            <UnifiedTrackActionsMenu
              trackId={currentTrack.id}
              trackStatus={currentTrack.status || 'completed'}
              trackMetadata={null}
              currentVersionId={currentVersionId || currentTrack.id}
              versionNumber={currentTrack.versionNumber}
              isMasterVersion={availableVersions[currentVersionIndex]?.isMasterVersion ?? false}
              variant="minimal"
              showQuickActions={false}
              layout="flat"
              enableAITools={false}
              isPublic={false}
              hasVocals={false}
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

