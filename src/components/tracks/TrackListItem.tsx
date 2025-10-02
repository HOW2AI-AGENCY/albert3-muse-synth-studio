import { useState } from "react";
import { Play, Pause, Heart, Download, Share2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { cn } from "@/lib/utils";

interface TrackListItemProps {
  track: {
    id: string;
    title: string;
    audio_url?: string;
    cover_url?: string;
    style_tags?: string[];
    duration_seconds?: number;
    status: string;
    like_count?: number;
  };
  onClick?: () => void;
  onLike?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

export const TrackListItem = ({
  track,
  onClick,
  onLike,
  onDownload,
  onShare,
}: TrackListItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentTrack) {
      togglePlayPause();
    } else if (track.audio_url) {
      playTrack({
        ...track,
        audio_url: track.audio_url
      });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-3 rounded-lg transition-all hover:bg-card/50 cursor-pointer",
        isCurrentTrack && "bg-card/30"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover + Play Button */}
      <div className="relative w-14 h-14 flex-shrink-0">
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.title}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 rounded-md" />
        )}
        
        {/* Play/Pause overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/40 rounded-md transition-opacity",
            (isHovered || isCurrentTrack) && track.audio_url ? "opacity-100" : "opacity-0"
          )}
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-primary hover:bg-primary-glow"
            onClick={handlePlayClick}
            disabled={!track.audio_url || track.status !== 'completed'}
          >
            {isCurrentTrack && isPlaying ? (
              <Pause className="h-4 w-4 text-primary-foreground" />
            ) : (
              <Play className="h-4 w-4 text-primary-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{track.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          {track.style_tags && track.style_tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {track.style_tags.slice(0, 2).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs px-2 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {track.status !== 'completed' && (
            <Badge variant="outline" className="text-xs">
              {track.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="text-sm text-muted-foreground">
        {formatDuration(track.duration_seconds)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onLike?.();
          }}
        >
          <Heart className="h-4 w-4" />
        </Button>
        
        {track.audio_url && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onDownload?.();
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onShare?.();
          }}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Like Count */}
      {track.like_count ? (
        <div className="text-sm text-muted-foreground">
          {track.like_count}
        </div>
      ) : null}
    </div>
  );
};
