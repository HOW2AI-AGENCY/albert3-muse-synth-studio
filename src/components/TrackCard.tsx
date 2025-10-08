import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Download,
  Heart,
  Share2,
  Clock,
  Music,
  Eye,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useTrackLike } from "@/hooks/useTrackLike";
import { withErrorBoundary } from "@/components/ErrorBoundary";
import { logError } from "@/utils/logger";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDuration } from "@/utils/formatters";

interface Track {
  id: string;
  title: string;
  prompt?: string;
  audio_url?: string;
  image_url?: string;
  cover_url?: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  has_vocals?: boolean;
  genre?: string;
  style_tags?: string[];
  lyrics?: string;
  like_count?: number;
  view_count?: number;
}

interface TrackCardProps {
  track: Track;
  onDownload?: () => void;
  onShare?: () => void;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "compact" | "minimal";
}

const gradients = [
  "from-purple-500/20 to-pink-500/20",
  "from-blue-500/20 to-cyan-500/20",
  "from-green-500/20 to-emerald-500/20",
  "from-orange-500/20 to-red-500/20",
  "from-indigo-500/20 to-purple-500/20",
  "from-teal-500/20 to-blue-500/20",
];

const getGradientByTrackId = (trackId: string) => {
  const index = trackId.charCodeAt(0) % gradients.length;
  return gradients[index];
};

const GenerationProgress: React.FC<{ track: Track }> = ({ track }) => {
  const [progress, setProgress] = useState(5);
  const [stage, setStage] = useState("Анализ промпта...");

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 99) {
          clearInterval(interval);
          return 99;
        }
        const increment = Math.random() * 4 + 1; // More realistic increment
        const newProgress = Math.min(prev + increment, 99);

        if (newProgress < 20) {
          setStage("Анализ промпта...");
        } else if (newProgress < 85) {
          setStage("Создание музыки...");
        } else {
          setStage("Финализация...");
        }

        return newProgress;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const estimatedTime = Math.max(0, Math.round((100 - progress) * 0.6));

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-white z-10 text-center transition-all duration-300">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <h4 className="font-semibold text-lg mb-2">{stage}</h4>
      <div className="w-full bg-white/20 rounded-full h-2 mb-2 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-sm text-white/80">Осталось примерно: {estimatedTime} сек.</p>
      <p className="text-xs text-white/60 mt-4">💡 Сложные треки могут занять больше времени</p>
    </div>
  );
};

const FailedState: React.FC<{ track: Track }> = ({ track }) => (
  <div className="absolute inset-0 bg-destructive/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-white z-10 text-center">
    <AlertTriangle className="w-8 h-8 mb-4" />
    <h4 className="font-semibold text-lg mb-2">Ошибка генерации</h4>
    <p className="text-sm text-destructive-foreground/90 line-clamp-3 mb-4">
      {track.error_message || "Произошла неизвестная ошибка."}
    </p>
    <Button variant="secondary" size="sm" onClick={() => alert("Функция повторной попытки в разработке")}>
      Попробовать снова
    </Button>
  </div>
);

const useFadeInOnIntersect = (ref: React.RefObject<HTMLDivElement>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
};

const useTrackCardActions = ({ track, onDownload, onShare, onClick }: TrackCardProps) => {
    const { toast } = useToast();
    const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
    const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);

    const isCurrentTrack = currentTrack?.id === track.id;
    const playButtonDisabled = track.status !== "completed" || !track.audio_url;

    const handleCardClick = useCallback(() => {
        if (track.status === 'completed') {
            onClick?.();
        }
    }, [onClick, track.status]);

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
            style_tags: track.style_tags,
            lyrics: track.lyrics,
        });
    }, [isCurrentTrack, isPlaying, togglePlayPause, track, playTrack, playButtonDisabled]);

    const handleLikeClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        toggleLike();
        toast({
            title: isLiked ? "Убрано из избранного" : "Добавлено в избранное",
            description: `Трек "${track.title}" ${isLiked ? "убран из" : "добавлен в"} избранное`,
            duration: 2000,
        });
    }, [isLiked, toggleLike, toast, track.title]);

    const handleDownloadClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        if (!track.audio_url) {
            toast({ title: "Ошибка", description: "Аудиофайл недоступен", variant: "destructive" });
            return;
        }
        onDownload?.();
        toast({ title: "Скачивание начато", description: `Трек "${track.title}" загружается` });
    }, [onDownload, toast, track.audio_url, track.title]);

    const handleShareClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        onShare?.();
        toast({ title: "Ссылка скопирована", description: `Ссылка на трек "${track.title}" скопирована` });
    }, [onShare, toast, track.title]);

    return {
      isLiked, likeCount, isCurrentTrack, isPlaying, playButtonDisabled,
      handleCardClick, handlePlayClick, handleLikeClick, handleDownloadClick, handleShareClick,
    };
};

interface ValidTrackCardProps extends TrackCardProps {
    track: Required<Pick<Track, 'id'>> & Track;
    variant?: "default" | "compact" | "minimal";
}

const DefaultTrackCard: React.FC<
  ValidTrackCardProps & {
    cardRef: React.RefObject<HTMLDivElement>;
    isHovered: boolean;
    onHoverChange: (value: boolean) => void;
    formattedDuration: string | null;
    gradient: string;
    actions: ReturnType<typeof useTrackCardActions>;
  }
> = ({ track, className, cardRef, isHovered, onHoverChange, formattedDuration, gradient, actions }) => (
    <Card
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-xl hover:shadow-primary/20",
        "border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/95",
        "hover:scale-[1.03] hover:-translate-y-2",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
        `before:${gradient}`,
        actions.isCurrentTrack && "ring-2 ring-primary/50",
        "flex flex-col h-full",
        className,
      )}
      onClick={actions.handleCardClick}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      role="article"
      aria-label={`Трек ${track.title || "Без названия"}`}
      tabIndex={0}
    >
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        {track.status === 'processing' && <GenerationProgress track={track} />}
        {track.status === 'failed' && <FailedState track={track} />}
        {track.status === 'completed' && (
            <>
                {track.cover_url || track.image_url ? (
                    <img
                        src={track.cover_url || track.image_url}
                        alt={`Обложка трека ${track.title || "Без названия"}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br transition-all duration-500", gradient)}>
                        <Music className="w-12 h-12 text-primary/60" aria-hidden="true" />
                    </div>
                )}
                <div
                    className={cn(
                        "absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-300",
                        isHovered || (actions.isCurrentTrack && actions.isPlaying) ? "opacity-100" : "opacity-0"
                    )}
                >
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={actions.handlePlayClick}
                        disabled={actions.playButtonDisabled}
                        className={cn(
                            "rounded-full w-16 h-16 sm:w-14 sm:h-14 transition-all duration-200 shadow-lg",
                            actions.isCurrentTrack && actions.isPlaying ? "bg-primary text-primary-foreground" : "bg-white/90 hover:bg-white text-black hover:scale-110"
                        )}
                        aria-label={actions.isCurrentTrack && actions.isPlaying ? `Приостановить` : `Воспроизвести`}
                    >
                        {actions.isCurrentTrack && actions.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                    </Button>
                </div>
            </>
        )}
      </div>

      <CardContent className="relative p-4 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="font-semibold text-base mb-2 line-clamp-1 group-hover:text-primary transition-colors duration-300">
            {track.title || "Без названия"}
          </h3>

          {track.prompt && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{track.prompt}</p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-3">
              {formattedDuration && (
                <div className="flex items-center gap-1" aria-label={`Длительность: ${formattedDuration}`}>
                  <Clock className="w-3 h-3" />
                  <span>{formattedDuration}</span>
                </div>
              )}
              {track.view_count !== undefined && (
                <div className="flex items-center gap-1" aria-label={`Просмотров: ${track.view_count}`}>
                  <Eye className="w-3 h-3" />
                  <span>{track.view_count}</span>
                </div>
              )}
            </div>
          </div>

          {track.style_tags && track.style_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3" role="list" aria-label="Теги стилей">
              {track.style_tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                  {tag}
                </Badge>
              ))}
              {track.style_tags.length > 2 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/20 text-primary">
                  +{track.style_tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.handleLikeClick}
            className={cn("transition-all duration-300 hover:scale-110", actions.isLiked ? "text-red-500" : "hover:text-red-500")}
          >
            <Heart className={cn("w-4 h-4", actions.isLiked && "fill-current")} />
            {actions.likeCount > 0 && <span className="ml-1 text-xs">{actions.likeCount}</span>}
          </Button>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={actions.handleDownloadClick} disabled={track.status !== "completed"} className="hover:text-green-500"><Download className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={actions.handleShareClick} className="hover:text-blue-500"><Share2 className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
);

const ValidTrackCard: React.FC<ValidTrackCardProps> = ({ variant = "default", ...props }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const actions = useTrackCardActions(props);
    const formattedDuration = props.track.duration ? formatDuration(props.track.duration) : null;
    const gradient = getGradientByTrackId(props.track.id);

    useFadeInOnIntersect(cardRef);

    // Compact variant can be added here if needed

    return (
      <DefaultTrackCard
        {...props}
        variant={variant}
        cardRef={cardRef}
        isHovered={isHovered}
        onHoverChange={setIsHovered}
        formattedDuration={formattedDuration}
        gradient={gradient}
        actions={actions}
      />
    );
};

const TrackCardComponent = ({ track, ...rest }: TrackCardProps) => {
    if (!track || !track.id) {
      logError("Invalid track data", undefined, "TrackCard", { track });
      return (
        <Card className="p-4" role="alert"><p className="text-center text-sm text-muted-foreground">Некорректные данные трека</p></Card>
      );
    }
    return <ValidTrackCard track={track as Required<Pick<Track, 'id'>> & Track} {...rest} />;
};

export const TrackCard = memo(withErrorBoundary(TrackCardComponent));
TrackCard.displayName = "TrackCard";

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.5s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

export default TrackCard;