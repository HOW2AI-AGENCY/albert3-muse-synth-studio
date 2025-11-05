import * as React from "react";
import { cn } from "@/lib/utils";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { EnhancedBadge } from "@/components/ui/enhanced-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, MoreHorizontal, Heart, Download, Share2, Music } from "lucide-react";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { formatTime } from "@/utils/formatters";

export interface Track {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  cover_url?: string;
  audio_url: string;
  status?: "completed" | "processing" | "error" | "draft";
  is_favorite?: boolean;
  created_at?: string;
  tags?: string[];
  version_count?: number;
}

export interface TrackCardProps {
  track: Track;
  variant?: "default" | "compact" | "featured";
  showActions?: boolean;
  onFavorite?: (trackId: string) => void;
  onPlay?: (track: Track) => void;
  onDownload?: (track: Track) => void;
  onShare?: (track: Track) => void;
  className?: string;
}

const TrackCard = React.forwardRef<HTMLDivElement, TrackCardProps>(
  ({ 
    track, 
    variant = "default", 
    showActions = true,
    onFavorite,
    onPlay,
    onDownload,
    onShare,
    className,
    ...props 
  }, ref) => {
    const playTrack = useAudioPlayerStore((state) => state.playTrack);
    const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
    const isPlaying = useAudioPlayerStore((state) => state.isPlaying);
    const [isHovered, setIsHovered] = React.useState(false);
    const [isFavorite, setIsFavorite] = React.useState(track.is_favorite || false);

    const isCurrentTrackPlaying = currentTrack?.id === track.id && isPlaying;

    const handlePlay = () => {
      if (onPlay) {
        onPlay(track);
      } else {
        playTrack({
          id: track.id,
          title: track.title,
          audio_url: track.audio_url,
          cover_url: track.cover_url,
          duration: track.duration,
        });
      }
    };

    const handleFavorite = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsFavorite(!isFavorite);
      onFavorite?.(track.id);
    };

    const handleDownload = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDownload?.(track);
    };

    const handleShare = (e: React.MouseEvent) => {
      e.stopPropagation();
      onShare?.(track);
    };

    const getStatusVariant = (status: Track["status"]) => {
      switch (status) {
        case "completed": return "success";
        case "processing": return "warning";
        case "error": return "destructive";
        case "draft": return "outline";
        default: return "secondary";
      }
    };

    const getStatusText = (status: Track["status"]) => {
      switch (status) {
        case "completed": return "Готов";
        case "processing": return "Обработка";
        case "error": return "Ошибка";
        case "draft": return "Черновик";
        default: return "";
      }
    };

    if (variant === "compact") {
      return (
        <Card
          ref={ref}
          className={cn(
            "group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 interactive-element",
            "cursor-pointer border-border/60 hover:border-primary/30",
            isCurrentTrackPlaying && "ring-2 ring-primary shadow-lg",
            className
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          {...props}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Cover Image */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-md overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                  {track.cover_url ? (
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Music className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Play Button Overlay */}
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/50 rounded-md transition-all duration-200",
                  isHovered || isCurrentTrackPlaying ? "opacity-100" : "opacity-0"
                )}>
                  <EnhancedButton
                    size="icon-sm"
                    variant={isCurrentTrackPlaying ? "default" : "glass"}
                    onClick={handlePlay}
                    className="h-8 w-8"
                  >
                    {isCurrentTrackPlaying ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </EnhancedButton>
                </div>
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium truncate">
                    {track.title}
                  </h3>
                  {track.status && track.status !== "completed" && (
                    <EnhancedBadge variant={getStatusVariant(track.status)} className="text-xs">
                      {getStatusText(track.status)}
                    </EnhancedBadge>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {track.artist && (
                    <span className="truncate">{track.artist}</span>
                  )}
                  {track.duration && (
                    <>
                      <span>•</span>
                      <span>{formatTime(track.duration)}</span>
                    </>
                  )}
                  {track.version_count && track.version_count > 1 && (
                    <>
                      <span>•</span>
                      <span>{track.version_count} версий</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              {showActions && (
                <div className={cn(
                  "flex items-center gap-1 transition-all duration-200",
                  isHovered ? "opacity-100" : "opacity-0"
                )}>
                  <EnhancedButton
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleFavorite}
                    className={cn(
                      "h-7 w-7",
                      isFavorite && "text-red-500 hover:text-red-600"
                    )}
                  >
                    <Heart className={cn("h-3 w-3", isFavorite && "fill-current")} />
                  </EnhancedButton>
                  
                  <EnhancedButton
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleDownload}
                    className="h-7 w-7"
                  >
                    <Download className="h-3 w-3" />
                  </EnhancedButton>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Default variant
    return (
      <Card
        ref={ref}
        className={cn(
          "group transition-all duration-300 hover:shadow-xl hover:-translate-y-2 interactive-element",
          "cursor-pointer border-border/60 hover:border-primary/30",
          isCurrentTrackPlaying && "ring-2 ring-primary shadow-xl",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        <CardContent className="p-0">
          {/* Cover Image with Overlay */}
          <div className="relative aspect-square overflow-hidden rounded-t-lg">
            {track.cover_url ? (
              <img
                src={track.cover_url}
                alt={track.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Overlay with Play Button */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent",
              "flex items-end justify-between p-4 transition-all duration-300",
              isHovered || isCurrentTrackPlaying ? "opacity-100" : "opacity-0"
            )}>
              <div className="flex items-center gap-2">
                <EnhancedButton
                  size="icon"
                  variant={isCurrentTrackPlaying ? "default" : "glass"}
                  onClick={handlePlay}
                  className="h-10 w-10 shadow-lg"
                >
                  {isCurrentTrackPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </EnhancedButton>
                
                {track.duration && (
                  <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded-md">
                    {formatTime(track.duration)}
                  </span>
                )}
              </div>

              {showActions && (
                <div className="flex items-center gap-1">
                  <EnhancedButton
                    size="icon-sm"
                    variant="glass"
                    onClick={handleFavorite}
                    className={cn(
                      "h-8 w-8",
                      isFavorite && "text-red-500 hover:text-red-600"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                  </EnhancedButton>
                  
                  <EnhancedButton
                    size="icon-sm"
                    variant="glass"
                    onClick={handleDownload}
                    className="h-8 w-8"
                  >
                    <Download className="h-4 w-4" />
                  </EnhancedButton>
                </div>
              )}
            </div>

            {/* Status Badge */}
            {track.status && track.status !== "completed" && (
              <div className="absolute top-3 left-3">
                <EnhancedBadge variant={getStatusVariant(track.status)}>
                  {getStatusText(track.status)}
                </EnhancedBadge>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate mb-1">
                  {track.title}
                </h3>
                {track.artist && (
                  <p className="text-sm text-muted-foreground truncate">
                    {track.artist}
                  </p>
                )}
              </div>

              {showActions && (
                <EnhancedButton
                  size="icon-sm"
                  variant="ghost"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </EnhancedButton>
              )}
            </div>

            {/* Tags and Metadata */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {track.tags?.slice(0, 2).map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-secondary rounded-md">
                    {tag}
                  </span>
                ))}
                {track.tags && track.tags.length > 2 && (
                  <span className="text-xs">+{track.tags.length - 2}</span>
                )}
              </div>

              {track.version_count && track.version_count > 1 && (
                <span>{track.version_count} версий</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

TrackCard.displayName = "TrackCard";

export { TrackCard };