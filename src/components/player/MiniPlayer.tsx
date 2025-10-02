import { Play, Pause, SkipBack, SkipForward, Maximize2, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveStack } from "@/components/ui/ResponsiveLayout";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer = ({ onExpand }: MiniPlayerProps) => {
  const { currentTrack, isPlaying, togglePlayPause, playNext, playPrevious, queue, currentQueueIndex } = useAudioPlayer();
  const { vibrate } = useHapticFeedback();

  if (!currentTrack) return null;

  const handlePlayPause = () => {
    vibrate('light');
    togglePlayPause();
  };

  const handleNext = () => {
    vibrate('light');
    playNext();
  };

  const handlePrevious = () => {
    vibrate('light');
    playPrevious();
  };

  const handleExpand = () => {
    vibrate('medium');
    onExpand();
  };

  return (
    <div
      onClick={handleExpand}
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-primary/20 shadow-glow cursor-pointer animate-slide-up safe-area-bottom hover:bg-card/98 transition-all duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            className="h-8 w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="default"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPause();
            }}
            className="h-10 w-10 rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all duration-200 hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="h-8 w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleExpand();
            }}
            className="h-8 w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </ResponsiveStack>
    </div>
  );
};
