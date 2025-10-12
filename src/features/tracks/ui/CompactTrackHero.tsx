import { Download, Heart, Music2, Play, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CompactTrackHeroProps {
  track: {
    title: string;
    cover_url?: string;
    status?: string;
    created_at?: string;
    duration_seconds?: number;
    style_tags?: string[] | null;
    play_count?: number;
    download_count?: number;
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
  onOpenPlayer?: () => void;
}

const formatCount = (count?: number) => {
  if (!count || count === 0) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const CompactTrackHero = ({
  track,
  artist = "Неизвестный артист",
  isLiked,
  likeCount,
  onLike,
  onDownload,
  onShare,
  onOpenPlayer,
}: CompactTrackHeroProps) => {
  return (
    <div className="relative overflow-hidden">
      {/* Blurred Cover Background */}
      {track.cover_url && (
        <>
          <div className="absolute inset-0 opacity-20">
            <img
              src={track.cover_url}
              alt=""
              className="h-full w-full object-cover blur-3xl scale-110"
              loading="eager"
            />
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        </>
      )}

      {/* Content - Vertical Centered Layout */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 py-4 space-y-2">
        {/* Compact Cover (96x96px) */}
        {track.cover_url && (
          <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-primary/20 shadow-xl">
            <img
              src={track.cover_url}
              alt={`Обложка трека ${track.title}`}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-xl font-bold text-foreground max-w-md">{track.title}</h1>

        {/* Artist / Caption */}
        <p className="text-sm text-muted-foreground">{artist}</p>

        {/* Horizontal Action Row with Inline Counters */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 h-9 px-3"
                  onClick={onLike}
                >
                  <Heart className={cn("h-4 w-4", isLiked && "fill-current text-red-500")} />
                  <span className="text-xs tabular-nums">{formatCount(likeCount)}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isLiked ? "Убрать из избранного" : "В избранное"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-1 h-9 px-3">
                  <Play className="h-4 w-4" />
                  <span className="text-xs tabular-nums">{formatCount(track.play_count)}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Прослушиваний</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-1 h-9 px-3" onClick={onDownload}>
                  <Download className="h-4 w-4" />
                  <span className="text-xs tabular-nums">{formatCount(track.download_count)}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Скачать MP3</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-1 h-9 px-3" onClick={onShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Поделиться</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Primary CTA Button */}
        {onOpenPlayer && (
          <Button className="w-full max-w-xs" size="default" onClick={onOpenPlayer}>
            <Music2 className="h-4 w-4 mr-2" />
            Открыть в плеере
          </Button>
        )}

        {/* Genre Tags (Read-only) */}
        {track.style_tags && track.style_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {track.style_tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
