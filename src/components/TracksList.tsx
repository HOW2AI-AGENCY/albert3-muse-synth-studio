import { Loader2, Music, RefreshCw } from "lucide-react";
import { useTracks } from "@/hooks/useTracks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ApiService, Track as ApiTrack } from "@/services/api.service";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrackCard } from "./TrackCard";
import { AudioPlayer } from "./AudioPlayer";

interface TracksListProps {
  refreshTrigger?: number;
}

interface Track extends ApiTrack {
  provider: string | null;
  lyrics: string | null;
  style_tags: string[] | null;
  has_vocals: boolean | null;
}

export const TracksList = ({ refreshTrigger }: TracksListProps) => {
  const { tracks, isLoading, deleteTrack, refreshTracks } = useTracks(refreshTrigger);
  const { toast } = useToast();
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});

  // Auto-check for stale processing tracks (over 10 minutes)
  useEffect(() => {
    const checkStaleProcessing = () => {
      const now = Date.now();
      tracks.forEach(track => {
        if (track.status === 'processing') {
          const createdAt = new Date(track.created_at).getTime();
          const elapsed = now - createdAt;
          // If over 10 minutes (600000ms), mark as likely stale
          if (elapsed > 600000) {
            console.warn('Stale processing track detected:', track.id, 'elapsed:', elapsed);
          }
        }
      });
    };
    checkStaleProcessing();
    const interval = setInterval(checkStaleProcessing, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tracks]);

  const retryTrack = async (track: Track) => {
    setRetrying(prev => ({ ...prev, [track.id]: true }));
    try {
      // Delete the old track
      await deleteTrack(track.id);
      
      // Create a new track with the same params
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newTrack = await ApiService.createTrack(
        user.id,
        track.title,
        track.prompt,
        track.provider || 'replicate',
        track.lyrics || undefined,
        track.has_vocals || false,
        track.style_tags || []
      );

      // Start generation
      await ApiService.generateMusic({
        trackId: newTrack.id,
        prompt: track.prompt,
        provider: (track.provider as 'suno' | 'replicate') || 'replicate',
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
      console.error('Retry error:', error);
      toast({
        title: 'Ошибка повтора',
        description: error instanceof Error ? error.message : 'Не удалось перезапустить',
        variant: 'destructive',
      });
    } finally {
      setRetrying(prev => ({ ...prev, [track.id]: false }));
    }
  };

  const isStale = (track: Track) => {
    if (track.status !== 'processing') return false;
    const createdAt = new Date(track.created_at).getTime();
    const elapsed = Date.now() - createdAt;
    return elapsed > 600000; // 10 minutes
  };

  const handlePlay = (track: Track) => {
    // AudioPlayer handles play functionality
    console.log('Playing track:', track.id);
  };

  const handleLike = async (trackId: string) => {
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
      console.error('Like error:', error);
    }
  };

  const handleDownload = (track: Track) => {
    if (!track.audio_url) return;
    window.open(track.audio_url, '_blank');
  };

  const handleShare = (track: Track) => {
    const url = `${window.location.origin}/track/${track.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Ссылка скопирована",
      description: "Ссылка на трек скопирована в буфер обмена",
    });
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
        <h2 className="text-3xl font-bold text-gradient-primary">Ваши треки</h2>
        <Badge variant="outline" className="text-base px-4 py-2 shadow-glow">
          {tracks.length} {tracks.length === 1 ? "трек" : "треков"}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tracks.map((track) => {
          const showRetry = track.status === 'failed' || isStale(track as Track);
          
          return (
            <div key={track.id} className="space-y-2">
              {showRetry && (
                <div className="flex gap-2 items-center">
                  {isStale(track as Track) && (
                    <Badge variant="outline" className="text-xs text-orange-500">
                      Возможно зависло
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retryTrack(track as Track)}
                    disabled={retrying[track.id]}
                    className="gap-1 h-7 text-xs ml-auto"
                  >
                    <RefreshCw className={`h-3 w-3 ${retrying[track.id] ? 'animate-spin' : ''}`} />
                    Повторить
                  </Button>
                </div>
              )}
              
              <TrackCard
                track={track}
                onPlay={() => handlePlay(track as Track)}
                onLike={() => handleLike(track.id)}
                onDownload={() => handleDownload(track as Track)}
                onShare={() => handleShare(track as Track)}
              />
              
              {track.audio_url && track.status === 'completed' && (
                <AudioPlayer
                  trackId={track.id}
                  title={track.title}
                  audioUrl={track.audio_url}
                  onDelete={() => deleteTrack(track.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
