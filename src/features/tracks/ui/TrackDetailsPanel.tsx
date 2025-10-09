import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    version_number: number;
    duration?: number | null;
    created_at?: string | null;
    is_master?: boolean;
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
    console.error("Failed to format date", error);
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

export const TrackDetailsPanel = ({ track, activeVersion }: TrackDetailsPanelProps) => {
  const artist = extractArtist(track.metadata) ?? "Неизвестный артист";
  const createdAt = activeVersion?.created_at ?? track.created_at;
  const duration = activeVersion?.duration ?? track.duration_seconds ?? track.duration ?? null;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {track.cover_url && (
            <div className="sm:w-32 sm:flex-shrink-0">
              <div className="aspect-square rounded-lg overflow-hidden border border-border/60 shadow-md">
                <img
                  src={track.cover_url}
                  alt={`Обложка трека ${track.title}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold leading-tight sm:text-xl">{track.title}</h2>
                {track.status && (
                  <Badge variant={track.status === "completed" ? "default" : "secondary"} className="text-xs">
                    {track.status === "completed" ? "Готов" : track.status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{artist}</p>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <MetadataItem label="Версия" value={activeVersion ? `№ ${activeVersion.version_number}` : "—"} />
              <MetadataItem label="Дата создания" value={formatDate(createdAt)} />
              <MetadataItem label="Длительность" value={formatDuration(duration ?? undefined)} />
              <MetadataItem label="Жанр" value={track.genre || "—"} />
              <MetadataItem label="Настроение" value={track.mood || "—"} />
              <MetadataItem
                label="Статус"
                value={track.status ? (track.status === "completed" ? "Завершён" : track.status) : "—"}
              />
            </div>

            {track.style_tags && track.style_tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Теги стиля</h3>
                <div className="flex flex-wrap gap-2">
                  {track.style_tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs font-medium">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MetadataItemProps {
  label: string;
  value: string;
}

const MetadataItem = ({ label, value }: MetadataItemProps) => (
  <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/60 p-3">
    <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className={cn("text-sm font-medium", value === "—" && "text-muted-foreground")}>{value}</span>
  </div>
);
