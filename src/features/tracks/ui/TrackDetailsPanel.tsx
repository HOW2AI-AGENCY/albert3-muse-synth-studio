import { memo, useMemo, type ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";
import { Music, Clock, Calendar, FileText } from "@/utils/iconImports";

interface TrackDetailsPanelProps {
  track: {
    title: string;
    cover_url?: string;
    created_at?: string;
    genre?: string | null;
    mood?: string | null;
    style_tags?: string[] | null;
    status?: string;
    metadata?: Record<string, unknown> | null;
    duration_seconds?: number | null;
    duration?: number | null;
  };
  activeVersion?: {
    id: string;
    variant_index: number;
    duration?: number | null;
    created_at?: string | null;
    is_preferred_variant?: boolean;
    is_primary_variant?: boolean;
  } | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    logger.error("Failed to format date", error instanceof Error ? error : new Error(String(error)), "TrackDetailsPanel", { value });
    return "—";
  }
};

const formatDuration = (value?: number | null) => {
  if (!value || Number.isNaN(value)) {
    return "—";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const extractArtist = (metadata?: Record<string, unknown> | null) => {
  if (!metadata) {
    return undefined;
  }

  const artistKeys = ["artist", "artist_name", "artistName", "creator", "performer"] as const;

  for (const key of artistKeys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
};

export const TrackDetailsPanel = memo(({ track, activeVersion }: TrackDetailsPanelProps) => {
  const artist = extractArtist(track.metadata) ?? "Неизвестный артист";
  const createdAt = activeVersion?.created_at ?? track.created_at;
  const duration = activeVersion?.duration ?? track.duration_seconds ?? track.duration ?? null;

  const statusConfig = useMemo(() => {
    const status = track.status;
    if (status === "completed") return { variant: "default" as const, label: "✅ Готов", color: "text-success" };
    if (status === "processing") return { variant: "secondary" as const, label: "⏳ Обработка", color: "text-warning" };
    if (status === "failed") return { variant: "destructive" as const, label: "❌ Ошибка", color: "text-destructive" };
    return { variant: "secondary" as const, label: "⏸️ Ожидание", color: "text-muted-foreground" };
  }, [track.status]);

  return (
    <Card className="border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Badge variant={statusConfig.variant} className="text-xs font-medium px-2.5 py-0.5">
            {statusConfig.label}
          </Badge>
          {activeVersion && (
            <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
              Вариант #{activeVersion.variant_index}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Hero Section with Cover & Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {track.cover_url && (
            <div className="sm:w-32 sm:flex-shrink-0">
              <div className="group relative aspect-square rounded-xl overflow-hidden border-2 border-border/60 shadow-lg hover:shadow-2xl transition-all duration-300">
                <img
                  src={track.cover_url}
                  alt={`Обложка трека ${track.title}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Floating music icon */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-primary/90 backdrop-blur-sm rounded-full p-1.5">
                    <Music className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold leading-tight sm:text-2xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {track.title}
              </h2>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                {artist}
              </p>
            </div>

            {/* Quick Stats Row */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {createdAt && (
                <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(createdAt)}</span>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(duration)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Metadata Grid - Improved Layout */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 text-sm">
          <MetadataItem 
            icon={FileText}
            label="Жанр" 
            value={track.genre || "—"} 
            highlight={!!track.genre}
          />
          <MetadataItem 
            icon={FileText}
            label="Настроение" 
            value={track.mood || "—"} 
            highlight={!!track.mood}
          />
          <MetadataItem 
            icon={Clock}
            label="Длительность" 
            value={formatDuration(duration ?? undefined)} 
            highlight={!!duration}
          />
        </div>

        {/* Style Tags - Enhanced Design */}
        {track.style_tags && track.style_tags.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Теги стиля</h3>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {track.style_tags.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {track.style_tags.map((tag, index) => (
                <Badge 
                  key={`${tag}-${index}`}
                  variant="secondary" 
                  className="text-xs font-medium px-2.5 py-1 hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

TrackDetailsPanel.displayName = 'TrackDetailsPanel';

interface MetadataItemProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}

const MetadataItem = memo(({ icon: Icon, label, value, highlight = false }: MetadataItemProps) => (
  <div className={cn(
    "group flex flex-col gap-1.5 rounded-lg border p-3 transition-all duration-200",
    highlight 
      ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 hover:shadow-md" 
      : "border-border/40 bg-background/40 hover:bg-muted/50 hover:border-border/60"
  )}>
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className={cn("w-3.5 h-3.5", highlight ? "text-primary" : "text-muted-foreground")} />}
      <span className={cn(
        "text-[10px] uppercase tracking-wider font-semibold",
        highlight ? "text-primary/80" : "text-muted-foreground/80"
      )}>
        {label}
      </span>
    </div>
    <span className={cn(
      "text-sm font-semibold transition-colors",
      value === "—" ? "text-muted-foreground/50" : highlight ? "text-primary" : "text-foreground"
    )}>
      {value}
    </span>
  </div>
));

MetadataItem.displayName = 'MetadataItem';
