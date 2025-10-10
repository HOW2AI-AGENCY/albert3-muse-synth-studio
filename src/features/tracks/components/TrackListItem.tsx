import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Play,
  Pause,
  Heart,
  Download,
  Share2,
  Music,
  Headphones,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useTrackLike } from "@/features/tracks/hooks";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/formatters";

// Упрощенный интерфейс, аналогичный TrackCard
interface Track {
  id: string;
  title: string;
  audio_url?: string;
  cover_url?: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  style_tags?: string[];
  like_count?: number;
  created_at?: string;
}

interface TrackListItemProps {
  track: Track;
  onClick?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  className?: string;
}

const TrackListItemComponent = ({ track, onClick, onDownload, onShare, onRetry, onDelete, className }: TrackListItemProps) => {
  const { currentTrack, isPlaying, playTrack } = useAudioPlayer();
  const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = itemRef.current;
    if (element) {
      element.classList.add('animate-fade-in');
    }
    setIsVisible(true);
  }, []);

  const isCurrentTrack = currentTrack?.id === track.id;
  const playButtonDisabled = track.status !== "completed" || !track.audio_url;

  const handlePlayClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (playButtonDisabled) return;
    playTrack({
      id: track.id,
      title: track.title,
      audio_url: track.audio_url!,
      cover_url: track.cover_url,
      duration: track.duration,
      status: track.status,
    });
  }, [playButtonDisabled, playTrack, track]);

  const handleLikeClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    toggleLike();
  }, [toggleLike]);

  const handleDownloadClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onDownload?.();
  }, [onDownload]);

  const handleShareClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onShare?.();
  }, [onShare]);

  const handleRetryClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onRetry?.(track.id);
  }, [onRetry, track.id]);

  const handleDeleteClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete?.(track.id);
  }, [onDelete, track.id]);

  const isStuck = track.created_at && 
    (Date.now() - new Date(track.created_at).getTime()) > 5 * 60 * 1000; // 5 минут

  const formattedDuration = track.duration ? formatDuration(track.duration) : null;

  return (
    <div
      ref={itemRef}
      data-testid={`track-list-item-${track.id}`}
      className={cn(
        isVisible ? "group flex items-center gap-3 p-2 rounded-lg transition-colors duration-200 opacity-100 animate-fade-in" : "group flex items-center gap-3 p-2 rounded-lg transition-colors duration-200 opacity-0",
        "hover:bg-muted/50",
        isCurrentTrack && "bg-primary/10",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Трек ${track.title}`}
    >
      <div className="relative flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-muted">
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <div
          className={cn(
            "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200",
            (isHovered && track.status === 'completed') || isCurrentTrack ? "opacity-100" : "opacity-0"
          )}
        >
          {track.status === 'completed' ? (
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white" onClick={handlePlayClick} aria-label={isCurrentTrack && isPlaying ? "Приостановить" : "Воспроизвести"}>
              {isCurrentTrack && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
          ) : track.status === 'processing' ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("font-medium text-sm truncate", isCurrentTrack && "text-primary")}>{track.title}</p>
          {isCurrentTrack && isPlaying && <Headphones className="h-4 w-4 text-primary flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {track.status === 'completed' ? (
            <>
              {track.style_tags && <span>{track.style_tags.slice(0,2).join(', ')}</span>}
              {track.style_tags && track.style_tags.length > 2 && '...'}
            </>
          ) : (
            <span className="capitalize">{track.status}</span>
          )}
          {formattedDuration && <span>· {formattedDuration}</span>}
        </div>
      </div>

      <div className={cn(
        "flex items-center gap-1 transition-opacity duration-200",
        isHovered || isCurrentTrack ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"
      )}>
        {(track.status === 'processing' || track.status === 'pending' || track.status === 'failed') && isStuck && onRetry && onDelete ? (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-7 h-7" 
                    onClick={handleRetryClick}
                    aria-label="Повторить генерацию"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Повторить</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-7 h-7 text-destructive hover:text-destructive" 
                    onClick={handleDeleteClick}
                    aria-label="Удалить трек"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Удалить</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleLikeClick} aria-label={isLiked ? "Убрать из избранного" : "В избранное"}>
                    <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-red-500 text-red-500")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isLiked ? "Убрать из избранного" : "В избранное"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleDownloadClick} disabled={playButtonDisabled} aria-label="Скачать">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Скачать</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleShareClick} aria-label="Поделиться">
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Поделиться</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </div>
  );
};

export const TrackListItem = memo(TrackListItemComponent);

// Inject keyframes for fade-in animation once if not already present
if (typeof document !== "undefined" && !document.getElementById('track-card-animation-style')) {
  const style = document.createElement("style");
  style.id = 'track-card-animation-style';
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.4s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}