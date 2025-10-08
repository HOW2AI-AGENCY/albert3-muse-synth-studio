import { useEffect, useState, memo, useCallback, useMemo } from "react";
import { TrackCard } from "./TrackCard";
import { TrackListItem } from "./tracks/TrackListItem";
import { ViewSwitcher } from "./tracks/ViewSwitcher";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";
import { useTracks } from "@/hooks/useTracks";
import { ApiService, Track as ApiTrack } from "@/services/api.service";
import { Button } from "./ui/button";
import { RefreshCcw, Music, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "./ui/badge";
import { useAudioPlayerSafe } from "@/contexts/AudioPlayerContext";
import { logError, logWarn } from "@/utils/logger";

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
  selectedTrackId,
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

      await ApiService.generateMusic({
        userId: user.id,
        title: track.title,
        prompt: track.prompt,
        provider: (track.provider as 'suno' | 'replicate') || 'suno',
        lyrics: track.lyrics || undefined,
        hasVocals: track.has_vocals || false,
        styleTags: track.style_tags || [],
        customMode: !!(track.lyrics && track.style_tags?.length)
      });

      toast({
        title: 'Трек перезапущен',
        description: 'Генерация началась заново',
      });

      refreshTracks();
    } catch (error) {
      logError('Retry error:', error);
      toast({
        title: 'Ошибка повтора',
        description: error instanceof Error ? error.message : 'Не удалось перезапустить',
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

  // Мемоизируем функцию лайка
  const handleLike = useCallback(async (trackId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingLike } = await supabase
        .from('track_likes')
        .select()
        .eq('track_id', trackId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        await supabase
          .from('track_likes')
          .delete()
          .eq('track_id', trackId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('track_likes')
          .insert({ track_id: trackId, user_id: user.id });
      }

      refreshTracks();
    } catch (error) {
      logError('Like error:', error);
    }
  }, [refreshTracks]);

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LoadingSkeleton width="120px" height="32px" />
            <LoadingSkeleton width="60px" height="24px" />
          </div>
          <LoadingSkeleton width="100px" height="32px" />
        </div>
        
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="rectangular" height="300px" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
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
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Ваши треки</h2>
          <Badge variant="outline">
            {tracks.length} {tracks.length === 1 ? "трек" : "треков"}
          </Badge>
        </div>
        <ViewSwitcher view={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tracks.map((track) => {
            const typedTrack = track as Track;
            const isStaleTrack = isStale(typedTrack);
            
            return (
              <div key={track.id} className="space-y-3">
                <TrackCard
                  track={track}
                  onDownload={() => handleDownload(typedTrack)}
                  onShare={() => handleShare(track.id)}
                  onClick={() => {
                    onTrackSelect?.(typedTrack);
                    if (track.audio_url && track.status === 'completed' && audioPlayer?.playTrackWithQueue) {
                      audioPlayer.playTrackWithQueue({
                        id: track.id,
                        title: track.title,
                        audio_url: track.audio_url,
                        cover_url: track.cover_url,
                        duration: track.duration,
                        style_tags: track.style_tags,
                        lyrics: track.lyrics,
                      }, tracks.filter(t => t.audio_url && t.status === 'completed').map(t => ({
                        id: t.id,
                        title: t.title,
                        audio_url: t.audio_url!,
                        cover_url: t.cover_url,
                        duration: t.duration,
                        style_tags: t.style_tags,
                        lyrics: t.lyrics,
                      })));
                    }
                  }}
                />
                
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
        <div className="space-y-2">
          {tracks.map((track) => {
            const typedTrack = track as Track;
            const isStaleTrack = isStale(typedTrack);
            
            return (
              <div key={track.id} className="space-y-2">
                <TrackListItem
                  track={track}
                  onDownload={() => handleDownload(typedTrack)}
                  onShare={() => handleShare(track.id)}
                  onClick={() => {
                    onTrackSelect?.(typedTrack);
                    if (track.audio_url && track.status === 'completed' && audioPlayer?.playTrackWithQueue) {
                      audioPlayer.playTrackWithQueue({
                        id: track.id,
                        title: track.title,
                        audio_url: track.audio_url,
                        cover_url: track.cover_url,
                        duration: track.duration,
                        style_tags: track.style_tags,
                        lyrics: track.lyrics,
                      }, tracks.filter(t => t.audio_url && t.status === 'completed').map(t => ({
                        id: t.id,
                        title: t.title,
                        audio_url: t.audio_url!,
                        cover_url: t.cover_url,
                        duration: t.duration,
                        style_tags: t.style_tags,
                        lyrics: t.lyrics,
                      })));
                    }
                  }}
                />
                
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
