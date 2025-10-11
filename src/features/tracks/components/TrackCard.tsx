import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  Download,
  Heart,
  Share2,
  Clock,
  Music,
  AlertTriangle,
  RefreshCw,
  Trash2,
  MoreVertical,
  Split,
  Expand,
  Mic2,
  Globe,
  FileAudio,
} from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useTrackLike } from "@/features/tracks/hooks";
import { withErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDuration } from "@/utils/formatters";
import { TrackProgressBar } from "@/components/tracks/TrackProgressBar";
import { TrackSyncStatus } from "@/components/tracks/TrackSyncStatus";

// Сокращенный интерфейс для карточки
interface Track {
  id: string;
  title: string;
  audio_url?: string;
  cover_url?: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  style_tags?: string[];
  like_count?: number;
  view_count?: number;
  prompt?: string;
  progress_percent?: number | null;
  metadata?: Record<string, any> | null;
}

interface TrackCardProps {
  track: Track;
  onDownload?: () => void;
  onShare?: () => void;
  onClick?: () => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  className?: string;
}

// Упрощенные градиенты
const gradients = [
  "from-purple-500/10 to-pink-500/10",
  "from-blue-500/10 to-cyan-500/10",
  "from-green-500/10 to-emerald-500/10",
  "from-orange-500/10 to-red-500/10",
];

const getGradientByTrackId = (trackId: string) => {
  const index = trackId.charCodeAt(0) % gradients.length;
  return gradients[index];
};

const GenerationProgress: React.FC<{ 
  track: Track; 
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
}> = ({ track, onRetry, onDelete }) => {
  const trackForSync = {
    id: track.id,
    status: track.status,
    created_at: track.created_at,
    metadata: track.metadata as Record<string, any> | null | undefined,
  };
  
  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-white z-10 text-center transition-opacity duration-300">
      <div className="w-full max-w-[200px]">
        <TrackSyncStatus track={trackForSync} />
      </div>
      
      {(onRetry || onDelete) && (
        <div className="flex gap-2 mt-3">
          {onRetry && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(track.id);
                    }}
                    className="h-8 w-8"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Повторить</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(track.id);
                    }}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Удалить</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  );
};

const FailedState: React.FC<{ 
  message?: string;
  trackId: string;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
}> = ({ message, trackId, onRetry, onDelete }) => (
  <div className="absolute inset-0 bg-destructive/70 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-white z-10 text-center">
    <AlertTriangle className="w-6 h-6 mb-2" />
    <h4 className="font-semibold text-sm">Ошибка</h4>
    <p className="text-xs text-destructive-foreground/80 line-clamp-2 mb-3">
      {message || "Не удалось создать трек."}
    </p>
    
    <div className="flex gap-2">
      {onRetry && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(trackId);
                }}
                className="h-8 w-8"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Повторить</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {onDelete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(trackId);
                }}
                className="h-8 w-8"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Удалить</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  </div>
);

const TrackCardComponent = ({ track, onDownload, onShare, onClick, onRetry, onDelete, onExtend, onCover, onSeparateStems, className }: TrackCardProps) => {
  const { toast } = useToast();
  const { currentTrack, isPlaying, playTrack } = useAudioPlayer();
  const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cardRef.current;
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
    if (!track.audio_url) {
      toast({ title: "Ошибка", description: "Аудиофайл недоступен", variant: "destructive" });
      return;
    }
    onDownload?.();
    toast({ title: "Скачивание начато" });
  }, [onDownload, toast, track.audio_url]);

  const handleShareClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onShare?.();
  }, [onShare]);

  const gradient = getGradientByTrackId(track.id);
  const formattedDuration = track.duration ? formatDuration(track.duration) : null;

  return (
    <Card
      ref={cardRef}
    className={cn(
      "group relative overflow-hidden cursor-pointer transition-all duration-300",
      "border-border/50 bg-card hover:bg-muted/30",
      isVisible ? "h-full flex flex-col opacity-100 animate-fade-in" : "h-full flex flex-col opacity-0",
      isCurrentTrack && "ring-2 ring-primary/80",
      className,
    )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`Трек ${track.title}`}
      tabIndex={0}
    >
      <div className="relative aspect-square bg-gradient-to-br from-gray-800 to-gray-900">
        {(track.status === 'processing' || track.status === 'pending') && (
          <GenerationProgress track={track} onRetry={onRetry} onDelete={onDelete} />
        )}
        {track.status === 'failed' && (
          <FailedState message={track.error_message} trackId={track.id} onRetry={onRetry} onDelete={onDelete} />
        )}

        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={`Обложка трека ${track.title}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", gradient)}>
            <Music className="w-8 h-8 text-primary/50" />
          </div>
        )}

        {track.status === 'completed' && (
          <div
            className={cn(
              "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300",
              isHovered || (isCurrentTrack && isPlaying) ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"
            )}
          >
            <Button
              variant="secondary"
              size="icon"
              onClick={handlePlayClick}
              disabled={playButtonDisabled}
              className="rounded-full w-10 h-10 shadow-lg hover:scale-110 transition-transform"
              aria-label={isCurrentTrack && isPlaying ? "Приостановить" : "Воспроизвести"}
            >
              {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-2 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="font-semibold text-sm leading-tight mb-0.5 line-clamp-1 group-hover:text-primary">
            {track.title}
            {/* Показываем метку версии если это extended/cover трек */}
            {track.metadata && (
              (track.metadata as { extended_from?: string; is_cover?: boolean }).extended_from ? 
                <span className="text-xs text-muted-foreground font-normal ml-1">(Extended)</span> : 
              (track.metadata as { extended_from?: string; is_cover?: boolean }).is_cover ? 
                <span className="text-xs text-muted-foreground font-normal ml-1">(Cover)</span> : 
              null
            )}
          </h3>
          <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{track.prompt}</p>
        </div>

        {(track.status === 'processing' || track.status === 'pending') && (
          <div className="mb-2">
            <TrackProgressBar
              progress={track.progress_percent || 0}
              status={track.status}
              createdAt={track.created_at}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
          <div className="flex items-center gap-2">
            {formattedDuration && (
              <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{formattedDuration}</span></div>
            )}
          </div>
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={handleLikeClick} aria-label={isLiked ? "Убрать из избранного" : "В избранное"}>
                    <Heart className={cn("w-3 h-3", isLiked && "fill-red-500 text-red-500")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isLiked ? "Убрать из избранного" : "В избранное"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {track.status === 'completed' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Опции"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-[200]">
                  <DropdownMenuItem onClick={handleDownloadClick}>
                    <Download className="w-4 h-4 mr-2" />
                    Скачать MP3
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast({ title: "Скоро", description: "Функция в разработке" }); }}>
                    <FileAudio className="w-4 h-4 mr-2" />
                    Скачать WAV
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleShareClick}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Поделиться
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast({ title: "Скоро", description: "Функция в разработке" }); }}>
                    <Globe className="w-4 h-4 mr-2" />
                    Опубликовать
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onSeparateStems?.(track.id);
                    }}
                    disabled={!onSeparateStems}
                  >
                    <Split className="w-4 h-4 mr-2" />
                    Разделить на стемы
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onExtend?.(track.id);
                    }}
                    disabled={!onExtend}
                  >
                    <Expand className="w-4 h-4 mr-2" />
                    Расширить трек
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onCover?.(track.id);
                    }}
                    disabled={!onCover}
                  >
                    <Mic2 className="w-4 h-4 mr-2" />
                    Создать кавер
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Error Boundary and Memoization
const TrackCardWithErrorBoundary = memo(withErrorBoundary(TrackCardComponent));
TrackCardWithErrorBoundary.displayName = "TrackCard";

export { TrackCardWithErrorBoundary as TrackCard };

// Inject keyframes for fade-in animation once
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