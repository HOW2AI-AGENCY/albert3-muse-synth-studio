import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Music, Headphones, AlertTriangle, Loader2, Play, Pause } from "@/utils/iconImports";
import { useCurrentTrack, useIsPlaying, useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/formatters";
import { TrackActionsMenu } from "@/features/tracks/components/shared/TrackActionsMenu";

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
  has_vocals?: boolean;
}

interface TrackListItemProps {
  track: Track;
  onClick?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onRetry?: (trackId: string) => void;
  onSync?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  className?: string;
}

const TrackListItemComponent = ({ track, onClick, onDownload, onShare, onRetry, onSync, onDelete, onSeparateStems, className }: TrackListItemProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
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

  const formattedDuration = track.duration ? formatDuration(track.duration) : null;

  return (
    <div
      ref={itemRef}
      data-testid={`track-list-item-${track.id}`}
      className={cn(
        isVisible ? "group flex items-center gap-3 p-2 rounded-lg transition-colors duration-200 opacity-100 animate-fade-in" : "group flex items-center gap-3 p-2 rounded-lg transition-colors duration-200 opacity-0",
        "hover:bg-muted/50 border-b border-border",
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
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <p className={cn("font-medium text-sm truncate", isCurrentTrack && "text-primary")}>{track.title}</p>
          {isCurrentTrack && isPlaying && <Headphones className="h-4 w-4 text-primary flex-shrink-0" />}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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

      <div
        className={cn(
          "flex items-center gap-0.5 transition-opacity duration-200",
          isHovered || isCurrentTrack ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <TrackActionsMenu
          trackId={track.id}
          trackStatus={track.status}
          hasVocals={track.has_vocals ?? true}
          trackMetadata={{ provider: 'suno' }}
          variant="minimal"
          onDownload={onDownload}
          onShare={onShare}
          onRetry={onRetry}
          onSync={onSync}
          onDelete={onDelete}
          onSeparateStems={onSeparateStems}
        />
      </div>
    </div>
  );
};

// Оптимизированная мемоизация: перерендер только при изменении критичных пропсов
export const TrackListItem = memo(TrackListItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.track.status === nextProps.track.status &&
    prevProps.track.like_count === nextProps.track.like_count &&
    prevProps.track.audio_url === nextProps.track.audio_url &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onDownload === nextProps.onDownload &&
    prevProps.onShare === nextProps.onShare &&
    prevProps.onRetry === nextProps.onRetry &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onSeparateStems === nextProps.onSeparateStems
  );
});

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