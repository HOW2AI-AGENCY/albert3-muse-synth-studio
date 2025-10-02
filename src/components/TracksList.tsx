import { AudioPlayer } from "./AudioPlayer";
import { Loader2, Music, Clock, CheckCircle, XCircle } from "lucide-react";
import { useTracks } from "@/hooks/useTracks";
import { Badge } from "@/components/ui/badge";

interface TracksListProps {
  refreshTrigger?: number;
}

export const TracksList = ({ refreshTrigger }: TracksListProps) => {
  const { tracks, isLoading, deleteTrack } = useTracks(refreshTrigger);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Готово
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3 animate-spin" />
            Обработка
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Ошибка
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Ожидание
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-6 rounded-full bg-gradient-primary/10 mb-6">
          <Music className="h-16 w-16 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold mb-2">Треков пока нет</h3>
        <p className="text-muted-foreground max-w-md">
          Создайте свой первый AI-трек прямо сейчас! Опишите желаемую музыку и получите уникальную композицию.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gradient-secondary">Ваши треки</h2>
        <Badge variant="outline" className="text-base px-4 py-2">
          {tracks.length} {tracks.length === 1 ? "трек" : "треков"}
        </Badge>
      </div>
      
      <div className="grid gap-4">
        {tracks.map((track) => (
          <div key={track.id} className="space-y-2">
            <div className="flex items-center gap-2">
              {getStatusBadge(track.status)}
              {track.error_message && (
                <span className="text-xs text-destructive">{track.error_message}</span>
              )}
            </div>
            <AudioPlayer
              trackId={track.id}
              title={track.title}
              audioUrl={track.audio_url || undefined}
              onDelete={() => deleteTrack(track.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
