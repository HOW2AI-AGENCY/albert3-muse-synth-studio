import { Play, Pause, SkipBack, SkipForward, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface MiniPlayerProps {
  onExpand: () => void;
}

export const MiniPlayer = ({ onExpand }: MiniPlayerProps) => {
  const { currentTrack, isPlaying, togglePlayPause, playNext, playPrevious } = useAudioPlayer();
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 cursor-pointer animate-slide-up"
    >
      <div className="flex items-center gap-3 p-3">
        {/* Album Art */}
        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {currentTrack.cover_url ? (
            <img
              src={currentTrack.cover_url}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary" />
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {currentTrack.title}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {currentTrack.style_tags?.[0] || 'AI Generated'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            className="h-9 w-9"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPause();
            }}
            className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5" fill="currentColor" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="h-9 w-9"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleExpand();
            }}
            className="h-9 w-9 ml-1"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
