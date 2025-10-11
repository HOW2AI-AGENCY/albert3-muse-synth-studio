import { Heart, Download, Share2, Music, Clock, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CompactTrackHeroProps {
  track: {
    title: string;
    cover_url?: string;
    status: string;
    created_at?: string;
    duration_seconds?: number;
  };
  activeVersion?: {
    version_number: number;
    created_at?: string;
    duration?: number;
  } | null;
  artist?: string;
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
  onDownload: () => void;
  onShare: () => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDate = (date?: string) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

export const CompactTrackHero = ({
  track,
  activeVersion,
  artist = "Неизвестный артист",
  isLiked,
  likeCount,
  onLike,
  onDownload,
  onShare,
}: CompactTrackHeroProps) => {
  const duration = activeVersion?.duration ?? track.duration_seconds;
  const createdAt = activeVersion?.created_at ?? track.created_at;

  return (
    <div className="relative h-48 overflow-hidden">
      {/* Blurred Cover Background */}
      {track.cover_url && (
        <div className="absolute inset-0 opacity-30">
          <img
            src={track.cover_url}
            alt=""
            className="w-full h-full object-cover blur-2xl scale-110"
            loading="eager"
          />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center gap-4 p-6">
        {/* Compact Cover (80x80px) */}
        {track.cover_url && (
          <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/30 shadow-xl shrink-0">
            <img
              src={track.cover_url}
              alt={`Обложка трека ${track.title}`}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Metadata */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title + Status Badge */}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold truncate text-foreground">
              {track.title}
            </h1>
            <Badge
              variant={track.status === "completed" ? "default" : "secondary"}
              className="shrink-0 text-xs"
            >
              {track.status === "completed" ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Готов
                </>
              ) : (
                "В процессе"
              )}
            </Badge>
          </div>

          {/* Artist */}
          <p className="text-sm text-muted-foreground">{artist}</p>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {activeVersion && (
              <Badge variant="outline" className="gap-1">
                <Music className="h-3 w-3" />
                v{activeVersion.version_number}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(createdAt)}
            </Badge>
          </div>
        </div>

        {/* Action Buttons (Vertical) */}
        <div className="flex flex-col gap-2 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={isLiked ? "default" : "secondary"}
                  className="relative"
                  onClick={onLike}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                  {likeCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                      {likeCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isLiked ? "Убрать из избранного" : "В избранное"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="secondary" onClick={onDownload}>
                  <Download className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Скачать MP3</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="secondary" onClick={onShare}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Поделиться</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};
