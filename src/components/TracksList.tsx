import { useState, memo, useCallback } from "react";
import { TrackCard } from "@/features/tracks/components/TrackCard";
import { TrackListItem } from "@/features/tracks/components/TrackListItem";
import { ViewSwitcher } from "./tracks/ViewSwitcher";
import { LoadingSkeleton as Skeleton } from "./ui/LoadingSkeleton";
import { Track } from "@/services/api.service";
import { Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

interface TracksListProps {
  tracks: Track[];
  isLoading: boolean;
  deleteTrack: (trackId: string) => Promise<void>;
  refreshTracks: () => void;
}

const TracksListComponent = ({
  tracks,
  isLoading,
}: TracksListProps) => {
  const { playTrackWithQueue } = useAudioPlayer();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tracks-view-mode') : 'grid';
    return (saved as 'grid' | 'list') || 'grid';
  });

  const handleViewChange = useCallback((view: 'grid' | 'list') => {
    setViewMode(view);
    localStorage.setItem('tracks-view-mode', view);
  }, []);

  const handlePlay = useCallback((track: Track) => {
    const playableTracks = tracks
      .filter(t => t.status === 'completed' && t.audio_url)
      .map(t => ({
        id: t.id,
        title: t.title,
        audio_url: t.audio_url!,
        cover_url: t.cover_url || undefined,
        duration: t.duration || undefined,
      }));

    playTrackWithQueue({
      id: track.id,
      title: track.title,
      audio_url: track.audio_url!,
      cover_url: track.cover_url || undefined,
      duration: track.duration || undefined,
    }, playableTracks);
  }, [tracks, playTrackWithQueue]);

  const handleDownload = useCallback((track: Track) => {
    if (!track.audio_url) return;
    window.open(track.audio_url, '_blank');
    toast({ title: "Скачивание начато", description: `Трек "${track.title}" загружается.` });
  }, [toast]);

  const handleShare = useCallback((trackId: string) => {
    const url = `${window.location.origin}/track/${trackId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Ссылка скопирована" });
  }, [toast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <div className="p-4 mb-4 rounded-full bg-primary/10">
          <Music className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Библиотека пуста</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Создайте свой первый трек в панели слева. Он появится здесь, как только будет готов.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Ваши треки ({tracks.length})
        </h2>
        <ViewSwitcher view={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-3">
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track as any}
              onClick={() => handlePlay(track)}
              onDownload={() => handleDownload(track)}
              onShare={() => handleShare(track.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track) => (
            <TrackListItem
              key={track.id}
              track={track as any}
              onClick={() => handlePlay(track)}
              onDownload={() => handleDownload(track)}
              onShare={() => handleShare(track.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TracksList = memo(TracksListComponent);