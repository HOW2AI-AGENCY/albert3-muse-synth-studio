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
} from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useTrackLike } from "@/hooks/useTrackLike";
import { withErrorBoundary } from "@/components/ErrorBoundary";
import { logError } from "@/utils/logger";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Track {
  id: string;
  title: string;
  prompt?: string;
  audio_url?: string;
  image_url?: string;
  cover_url?: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "failed";
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

const StatusBadge: React.FC<{ status: Track["status"] }> = ({ status }) => {
  switch (status) {
    case "completed":
      return (
        <Badge variant="default" className="bg-green-500" aria-label="Статус: готов">
          Готов
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" aria-label="Статус: обработка">
          Обработка
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" aria-label="Статус: ошибка">
          Ошибка
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" aria-label={`Статус: ${status}`}>
          {status}
        </Badge>
      );
  }
};

const useFadeInOnIntersect = (ref: React.RefObject<HTMLDivElement>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [ref]);
};

const useTrackCardActions = ({
  track,
  onDownload,
  onShare,
  onClick,
}: {
  track: Track;
  onDownload?: () => void;
  onShare?: () => void;
  onClick?: () => void;
}) => {
  const { toast } = useToast();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);

  const isCurrentTrack = currentTrack?.id === track.id;
  const playButtonDisabled = track.status === "processing";

  const handleCardClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handlePlayClick = useCallback(
    (event: React.MouseEvent) => {
      try {
        event.stopPropagation();

        if (isCurrentTrack && isPlaying) {
          togglePlayPause();
          return;
        }

        if (!track.audio_url) {
          toast({
            title: "Ошибка воспроизведения",
            description: "Аудиофайл недоступен для воспроизведения",
            variant: "destructive",
            duration: 3000,
          });
          return;
        }

        playTrack({
          id: track.id,
          title: track.title,
          audio_url: track.audio_url,
          cover_url: track.cover_url,
          duration: track.duration,
          status: track.status,
          style_tags: track.style_tags,
          lyrics: track.lyrics,
        });
      } catch (error) {
        logError(
          "TrackCard play error",
          error instanceof Error ? error : new Error(String(error)),
          "TrackCard",
          {
            trackId: track.id,
            trackTitle: track.title,
            audioUrl: track.audio_url,
          },
        );
      }
    },
    [isCurrentTrack, isPlaying, togglePlayPause, track, playTrack, toast],
  );

  const handleLikeClick = useCallback(
    (event: React.MouseEvent) => {
      try {
        event.stopPropagation();
        toggleLike();

        toast({
          title: isLiked ? "Убрано из избранного" : "Добавлено в избранное",
          description: `Трек "${track.title}" ${isLiked ? "убран из" : "добавлен в"} избранное`,
          duration: 2000,
        });
      } catch (error) {
        logError(
          "TrackCard like error",
          error instanceof Error ? error : new Error(String(error)),
          "TrackCard",
          {
            trackId: track.id,
            trackTitle: track.title,
          },
        );

        toast({
          title: "Ошибка",
          description: "Не удалось обновить статус избранного",
          variant: "destructive",
          duration: 3000,
        });
      }
    },
    [isLiked, toggleLike, toast, track.id, track.title],
  );

  const handleDownloadClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      if (!track.audio_url) {
        toast({
          title: "Ошибка скачивания",
          description: "Аудиофайл недоступен для скачивания",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      try {
        onDownload?.();

        toast({
          title: "Скачивание начато",
          description: `Трек "${track.title}" загружается`,
          duration: 3000,
        });
      } catch (error) {
        logError(
          "TrackCard download error",
          error instanceof Error ? error : new Error(String(error)),
          "TrackCard",
          {
            trackId: track.id,
            trackTitle: track.title,
          },
        );

        toast({
          title: "Ошибка скачивания",
          description: "Не удалось скачать трек",
          variant: "destructive",
          duration: 3000,
        });
      }
    },
    [onDownload, toast, track.audio_url, track.id, track.title],
  );

  const handleShareClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      try {
        onShare?.();

        toast({
          title: "Ссылка скопирована",
          description: `Ссылка на трек "${track.title}" скопирована в буфер обмена`,
          duration: 3000,
        });
      } catch (error) {
        logError(
          "TrackCard share error",
          error instanceof Error ? error : new Error(String(error)),
          "TrackCard",
          {
            trackId: track.id,
            trackTitle: track.title,
          },
        );

        toast({
          title: "Ошибка",
          description: "Не удалось поделиться треком",
          variant: "destructive",
          duration: 3000,
        });
      }
    },
    [onShare, toast, track.id, track.title],
  );

  return {
    isLiked,
    likeCount,
    isCurrentTrack,
    isPlaying,
    playButtonDisabled,
    handleCardClick,
    handlePlayClick,
    handleLikeClick,
    handleDownloadClick,
    handleShareClick,
  };
};

interface ValidTrackCardProps extends TrackCardProps {
  track: Track;
  variant?: "default" | "compact" | "minimal";
}

const CompactTrackCard: React.FC<
  ValidTrackCardProps & {
    cardRef: React.RefObject<HTMLDivElement>;
    isHovered: boolean;
    onHoverChange: (value: boolean) => void;
    formattedDuration: string | null;
    actions: ReturnType<typeof useTrackCardActions>;
  }
> = ({
  track,
  className,
  cardRef,
  isHovered,
  onHoverChange,
  formattedDuration,
  actions,
}) => (
  <Card
    ref={cardRef}
    className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10",
      "border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90",
      "hover:scale-[1.02] hover:-translate-y-1",
      className,
    )}
    onClick={actions.handleCardClick}
    onMouseEnter={() => onHoverChange(true)}
    onMouseLeave={() => onHoverChange(false)}
    role="article"
    aria-label={`Трек ${track.title || "Без названия"}`}
    tabIndex={0}
  >
    <CardContent className="p-3">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={actions.handlePlayClick}
          disabled={actions.playButtonDisabled}
          className={cn(
            "w-12 h-12 sm:w-10 sm:h-10 rounded-full transition-all duration-200 touch-action-manipulation",
            actions.isCurrentTrack && actions.isPlaying
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "hover:bg-primary/10 hover:scale-110",
          )}
          aria-label={
            actions.isCurrentTrack && actions.isPlaying
              ? `Приостановить воспроизведение трека ${track.title}`
              : `Воспроизвести трек ${track.title}`
          }
          aria-pressed={actions.isCurrentTrack && actions.isPlaying}
        >
          {actions.isCurrentTrack && actions.isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{track.title || "Без названия"}</h3>
          {track.prompt && (
            <p className="text-xs text-muted-foreground truncate">{track.prompt}</p>
          )}
        </div>

        {formattedDuration && (
          <span className="text-xs text-muted-foreground" aria-label={`Длительность: ${formattedDuration}`}>
            {formattedDuration}
          </span>
        )}

        <div
          className={cn(
            "flex items-center gap-1 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.handleLikeClick}
            className={cn(
              "w-10 h-10 sm:w-8 sm:h-8 p-0 transition-all duration-200 touch-action-manipulation",
              actions.isLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500",
            )}
            aria-label={
              actions.isLiked
                ? `Убрать из избранного: ${track.title}`
                : `Добавить в избранное: ${track.title}`
            }
            aria-pressed={actions.isLiked}
          >
            <Heart className={cn("w-4 h-4", actions.isLiked && "fill-current")} />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const DefaultTrackCard: React.FC<
  ValidTrackCardProps & {
    cardRef: React.RefObject<HTMLDivElement>;
    isHovered: boolean;
    onHoverChange: (value: boolean) => void;
    formattedDuration: string | null;
    gradient: string;
    actions: ReturnType<typeof useTrackCardActions>;
  }
> = ({
  track,
  className,
  cardRef,
  isHovered,
  onHoverChange,
  formattedDuration,
  gradient,
  actions,
}) => (
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
    <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 group-hover:shadow-lg transition-shadow duration-300">
      {track.cover_url || track.image_url ? (
        <img
          src={track.cover_url || track.image_url}
          alt={`Обложка трека ${track.title || "Без названия"}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center bg-gradient-to-br transition-all duration-500",
            gradient,
            "group-hover:scale-110",
          )}
        >
          <Music className="w-12 h-12 text-primary/60" aria-hidden="true" />
        </div>
      )}

      <div
        className={cn(
          "absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-300",
          "@media (hover: hover)",
          isHovered || (actions.isCurrentTrack && actions.isPlaying)
            ? "opacity-100"
            : "opacity-0 md:opacity-0",
        )}
      >
        <Button
          variant="secondary"
          size="lg"
          onClick={actions.handlePlayClick}
          disabled={actions.playButtonDisabled}
          className={cn(
            "rounded-full w-16 h-16 sm:w-14 sm:h-14 transition-all duration-200 shadow-lg touch-action-manipulation",
            actions.isCurrentTrack && actions.isPlaying
              ? "bg-primary text-primary-foreground shadow-primary/25"
              : "bg-white/90 hover:bg-white text-black hover:scale-110 hover:shadow-xl",
          )}
          aria-label={
            actions.isCurrentTrack && actions.isPlaying
              ? `Приостановить воспроизведение трека ${track.title}`
              : `Воспроизвести трек ${track.title}`
          }
          aria-pressed={actions.isCurrentTrack && actions.isPlaying}
        >
          {actions.isCurrentTrack && actions.isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </Button>
      </div>

      <div className="absolute top-2 right-2">
        <StatusBadge status={track.status} />
      </div>
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
                <Clock className="w-3 h-3" aria-hidden="true" />
                <span>{formattedDuration}</span>
              </div>
            )}

            {track.view_count !== undefined && (
              <div className="flex items-center gap-1" aria-label={`Просмотров: ${track.view_count}`}>
                <Eye className="w-3 h-3" aria-hidden="true" />
                <span>{track.view_count}</span>
              </div>
            )}
          </div>
        </div>

        {track.style_tags && track.style_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3" role="list" aria-label="Теги стилей">
            {track.style_tags.slice(0, 2).map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors duration-200"
                role="listitem"
              >
                {tag}
              </Badge>
            ))}
            {track.style_tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/20 text-primary" role="listitem">
                +{track.style_tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto" role="toolbar" aria-label="Действия с треком">
        <Button
          variant="ghost"
          size="sm"
          onClick={actions.handleLikeClick}
          className={cn(
            "transition-all duration-300 hover:scale-110",
            actions.isLiked ? "text-red-500 hover:text-red-600 animate-pulse" : "hover:text-red-500",
          )}
          aria-label={
            actions.isLiked
              ? `Убрать из избранного: ${track.title}`
              : `Добавить в избранное: ${track.title}`
          }
          aria-pressed={actions.isLiked}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-all duration-200",
              actions.isLiked && "fill-current scale-110",
            )}
          />
          {actions.likeCount > 0 && (
            <span className="ml-1 text-xs" aria-label={`${actions.likeCount} лайков`}>
              {actions.likeCount}
            </span>
          )}
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.handleDownloadClick}
            disabled={track.status !== "completed"}
            className="hover:text-green-500 transition-all duration-200 hover:scale-110"
            aria-label={`Скачать трек ${track.title}`}
          >
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={actions.handleShareClick}
            className="hover:text-blue-500 transition-all duration-200 hover:scale-110"
            aria-label={`Поделиться треком ${track.title}`}
          >
            <Share2 className="w-4 h-4" />
          </Button>
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

  if (variant === "compact") {
    return (
      <CompactTrackCard
        {...props}
        variant={variant}
        cardRef={cardRef}
        isHovered={isHovered}
        onHoverChange={setIsHovered}
        formattedDuration={formattedDuration}
        actions={actions}
      />
    );
  }

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

const InvalidTrackFallback: React.FC<{ track: TrackCardProps["track"] }> = ({ track }) => (
  <Card className="p-4" role="alert" aria-label="Ошибка загрузки трека">
    <div className="text-center">
      <Music className="mx-auto h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Некорректные данные трека</p>
      {track?.title && <p className="text-xs text-muted-foreground mt-1">{track.title}</p>}
    </div>
  </Card>
);

const TrackCardComponent = ({ track, ...rest }: TrackCardProps) => {
  if (!track || !track.id) {
    logError("Invalid track data", undefined, "TrackCard", { track });
    return <InvalidTrackFallback track={track} />;
  }

  return <ValidTrackCard track={track} {...rest} />;
};

export const TrackCard = memo(
  withErrorBoundary(TrackCardComponent, {
    FallbackComponent: ({ error }) => (
      <Card className="p-4">
        <div className="text-center">
          <Music className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Ошибка загрузки трека</p>
          <p className="text-xs text-muted-foreground mt-1">{error?.message}</p>
        </div>
      </Card>
    ),
    onError: (error, errorInfo) => {
      logError("TrackCard component error", error, "TrackCard", errorInfo);
    },
  }),
);

TrackCard.displayName = "TrackCard";

export default TrackCard;

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(var(--primary), 0.3); }
      50% { box-shadow: 0 0 30px rgba(var(--primary), 0.5); }
    }
    .animate-fade-in {
      animation: fade-in 0.6s ease-out;
    }
    .animate-pulse-glow {
      animation: pulse-glow 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}
