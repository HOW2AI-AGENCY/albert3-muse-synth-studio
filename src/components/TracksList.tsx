import { useEffect, useState, memo, useCallback } from "react";
import { TrackCard, TrackListItem } from "@/features/tracks";
import { ViewSwitcher } from "./tracks/ViewSwitcher";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";
import { ApiService, Track as ApiTrack } from "@/services/api.service";
import { Button } from "./ui/button";
import { RefreshCcw, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "./ui/badge";
import { useAudioPlayerSafe } from "@/contexts/AudioPlayerContext";
import { logError, logWarn } from "@/utils/logger";
import { TrackVersionBadge } from "./tracks/TrackVersionBadge";

interface Track extends ApiTrack {
  provider: string | null;
  lyrics: string | null;
  style_tags: string[] | null;
  has_vocals: boolean | null;
}

interface TracksListProps {
  tracks: Track[];
  isLoading: boolean;
  deleteTrack: (trackId: string) => Promise<void>;
  refreshTracks: () => void;
  onTrackSelect?: (track: Track) => void;
  selectedTrackId?: string;
}

const TracksListComponent = ({
  tracks,
  isLoading,
  deleteTrack,
  refreshTracks,
  onTrackSelect,
}: TracksListProps) => {
  const audioPlayer = useAudioPlayerSafe();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('tracks-view-mode');
    return (saved as 'grid' | 'list') || 'grid';
  });

  // Мемоизируем обработчик изменения вида
  const handleViewChange = useCallback((view: 'grid' | 'list') => {
    setViewMode(view);
    localStorage.setItem('tracks-view-mode', view);
  }, []);

  // Auto-check for stale processing tracks (over 10 minutes)
  useEffect(() => {
    const checkStaleProcessing = () => {
      const now = Date.now();
      tracks.forEach(track => {
        if (track.status === 'processing') {
          const createdAt = new Date(track.created_at).getTime();
          const elapsed = now - createdAt;
          if (elapsed > 600000) {
            logWarn(`Stale processing track detected: ${track.id}, elapsed: ${elapsed}`);
          }
        }
      });
    };
    checkStaleProcessing();
    const interval = setInterval(checkStaleProcessing, 60000);
    return () => clearInterval(interval);
  }, [tracks]);

  // Мемоизируем функцию повтора трека
  const retryTrack = useCallback(async (track: Track) => {
    try {
      await deleteTrack(track.id);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Re-create track record
      const newTrack = await ApiService.createTrack(
        user.id,
        track.title,
        track.prompt,
        (track.provider as 'suno' | 'replicate') || 'suno',
        track.lyrics || undefined,
        track.has_vocals || false,
        track.style_tags || []
      );

      // Step 2: Trigger generation
      await ApiService.generateMusic({
        userId: user.id,
        title: track.title,
        prompt: track.prompt,
        provider: (track.provider as 'suno' | 'replicate') || 'suno',
        lyrics: track.lyrics || undefined,
        hasVocals: track.has_vocals || false,
        styleTags: track.style_tags || [],
        customMode: !!(track.lyrics && track.style_tags?.length),
        trackId: newTrack.id
      });

      toast({
        title: 'Трек перезапущен',
        description: 'Генерация началась заново',
      });

      refreshTracks();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось перезапустить';
      logError('Retry error:', error instanceof Error ? error : new Error(String(error)));
      toast({
        title: 'Ошибка повтора',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [deleteTrack, toast, refreshTracks]);

  // Мемоизируем функцию проверки устаревших треков
  const isStale = useCallback((track: Track) => {
    if (track.status !== 'processing') return false;
    const createdAt = new Date(track.created_at).getTime();
    const elapsed = Date.now() - createdAt;
    return elapsed > 600000; // 10 minutes
  }, []);

  // Функцию лайка убрана - используется в TrackCard

  // Мемоизируем функцию скачивания
  const handleDownload = useCallback((track: Track) => {
    if (!track.audio_url) return;
    window.open(track.audio_url, '_blank');
  }, []);

  // Мемоизируем функцию поделиться
  const handleShare = useCallback((trackId: string) => {
    const url = `${window.location.origin}/track/${trackId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Ссылка скопирована",
      description: "Ссылка на трек скопирована в буфер обмена",
    });
  }, [toast]);

  if (isLoading) {
    return (
      <div className="app-stack">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LoadingSkeleton width="96px" height="28px" />
            <LoadingSkeleton width="56px" height="24px" />
          </div>
          <LoadingSkeleton width="88px" height="28px" />
        </div>

        {viewMode === 'grid' ? (
          <div className="app-grid app-grid--cards">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="rectangular" height="260px" />
            ))}
          </div>
        ) : (
          <div className="app-stack app-stack--tight">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="track-item" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <div className="p-4 rounded-full bg-gradient-primary/10">
          <Music className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Треков пока нет</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Создайте свой первый AI-трек: опишите настроение и получите готовую композицию через пару минут.
        </p>
      </div>
    );
  }

  return (
    <div className="app-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Ваши треки</h2>
          <Badge variant="outline" className="app-chip text-[11px]">
            {tracks.length} {tracks.length === 1 ? "трек" : "треков"}
          </Badge>
        </div>
        <ViewSwitcher view={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === 'grid' ? (
        <div className="app-grid app-grid--cards">
          {tracks.map((track) => {
            const typedTrack = track as Track;
            const isStaleTrack = isStale(typedTrack);

            return (
              <div key={track.id} className="space-y-3">
                <div className="relative">
                  <TrackCard
                    track={{
                      ...track,
                      audio_url: track.audio_url ?? undefined,
                      cover_url: track.cover_url ?? undefined,
                      duration: track.duration ?? undefined,
                      style_tags: track.style_tags ?? undefined,
                      lyrics: track.lyrics ?? undefined,
                      has_vocals: track.has_vocals ?? undefined,
                      genre: track.genre ?? undefined,
                      like_count: track.like_count ?? undefined,
                      view_count: track.view_count ?? undefined,
                      error_message: track.error_message ?? undefined,
                    }}
                    onDownload={() => handleDownload(typedTrack)}
                    onShare={() => handleShare(track.id)}
                    onClick={() => {
                      onTrackSelect?.(typedTrack);
                      if (track.audio_url && track.status === 'completed' && audioPlayer?.playTrackWithQueue) {
                        audioPlayer.playTrackWithQueue({
                          id: track.id,
                          title: track.title,
                          audio_url: track.audio_url,
                          cover_url: track.cover_url || undefined,
                          duration: track.duration || undefined,
                          style_tags: track.style_tags || undefined,
                          lyrics: track.lyrics || undefined,
                        }, tracks.filter(t => t.audio_url && t.status === 'completed').map(t => ({
                          id: t.id,
                          title: t.title,
                          audio_url: t.audio_url!,
                          cover_url: t.cover_url || undefined,
                          duration: t.duration || undefined,
                          style_tags: t.style_tags || undefined,
                          lyrics: t.lyrics || undefined,
                        })));
                      }
                    }}
                  />
                  {/* Бадж с количеством версий */}
                  {track.status === 'completed' && (
                    <div className="absolute top-2 right-2">
                      <TrackVersionBadge trackId={track.id} />
                    </div>
                  )}
                </div>
                
                {(track.status === 'failed' || isStaleTrack) && (
                  <Button
                    onClick={() => retryTrack(typedTrack)}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto touch-action-manipulation"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    {isStaleTrack ? "Повторить (застрял)" : "Повторить попытку"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="app-stack app-stack--tight">
          {tracks.map((track) => {
            const typedTrack = track as Track;
            const isStaleTrack = isStale(typedTrack);
            
            return (
              <div key={track.id} className="space-y-2">
                <div className="relative">
                  <TrackListItem
                    track={{
                      ...track,
                      audio_url: track.audio_url ?? undefined,
                      cover_url: track.cover_url ?? undefined,
                      duration: track.duration ?? undefined,
                      duration_seconds: track.duration_seconds ?? undefined,
                      style_tags: track.style_tags ?? undefined,
                      like_count: track.like_count ?? undefined,
                      has_stems: track.has_stems ?? undefined,
                      error_message: track.error_message ?? undefined,
                    }}
                    onDownload={() => handleDownload(typedTrack)}
                    onShare={() => handleShare(track.id)}
                    onClick={() => {
                      onTrackSelect?.(typedTrack);
                      if (track.audio_url && track.status === 'completed' && audioPlayer?.playTrackWithQueue) {
                        audioPlayer.playTrackWithQueue({
                          id: track.id,
                          title: track.title,
                          audio_url: track.audio_url,
                          cover_url: track.cover_url || undefined,
                          duration: track.duration || undefined,
                          style_tags: track.style_tags || undefined,
                          lyrics: track.lyrics || undefined,
                        }, tracks.filter(t => t.audio_url && t.status === 'completed').map(t => ({
                          id: t.id,
                          title: t.title,
                          audio_url: t.audio_url!,
                          cover_url: t.cover_url || undefined,
                          duration: t.duration || undefined,
                          style_tags: t.style_tags || undefined,
                          lyrics: t.lyrics || undefined,
                        })));
                      }
                    }}
                  />
                  {/* Компактный бадж версий для list view */}
                  {track.status === 'completed' && (
                    <div className="absolute top-2 right-2">
                      <TrackVersionBadge trackId={track.id} variant="outline" className="text-xs" />
                    </div>
                  )}
                </div>
                
                {(track.status === 'failed' || isStaleTrack) && (
                  <Button
                    onClick={() => retryTrack(typedTrack)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    {isStaleTrack ? "Повторить (застрял)" : "Повторить попытку"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Экспортируем мемоизированный компонент
export const TracksList = memo(TracksListComponent);
