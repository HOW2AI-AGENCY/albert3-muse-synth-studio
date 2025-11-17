import { memo, useCallback, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, X } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UnifiedTrackActionsMenu } from "@/components/tracks/shared/TrackActionsMenu.unified";
import { useTrackVersionLike } from "@/features/tracks/hooks/useTrackVersionLike";
import { useDownloadTrack } from "@/hooks/useDownloadTrack";

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
      className="fixed left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl transition-all duration-300"
      style={{
        bottom: 'calc(var(--bottom-tab-bar-height, 0px) + env(safe-area-inset-bottom))',
        zIndex: 'var(--z-mini-player)'
      }}
    >
      {/* Компактная двухстрочная разметка */}
      <div className="px-3 py-2 space-y-2">
        {/* Строка 1: Обложка + Инфо + Кнопки управления */}
        <div className="flex items-center gap-2">
          {/* Album Art */}
          <div 
            onClick={handleExpand}
            className={cn(
              "relative rounded-md overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group",
              "w-12 h-12"
            )}
          >
            {currentTrack.cover_url ? (
              <img
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

          {/* Track Info */}
          <div 
            onClick={handleExpand}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {currentTrack.title.replace(/\s*\(V\d+\)$/i, '')}
              </h4>
              {availableVersions.length > 1 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 flex-shrink-0">
                  V{currentTrack.versionNumber ?? currentVersionIndex + 1}
                </Badge>
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

        {/* Строка 2: Управление воспроизведением + Действия */}
        <div className="flex items-center gap-2">
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

          {/* Unified Actions Menu */}
          <div className="flex-1 flex justify-end">
            <UnifiedTrackActionsMenu
              trackId={currentTrack.id}
              trackStatus={currentTrack.status || 'completed'}
              trackMetadata={null}
              currentVersionId={currentVersionId || currentTrack.id}
              versionNumber={currentTrack.versionNumber}
              isMasterVersion={availableVersions[currentVersionIndex]?.isMasterVersion ?? false}
              variant="compact"
              showQuickActions={true}
              layout="flat"
              enableAITools={false}
              isPublic={false}
              hasVocals={false}
              isLiked={isLiked}
              onLike={toggleLike}
              onDownload={handleDownloadClick}
              onShare={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

MiniPlayer.displayName = 'MiniPlayer';

