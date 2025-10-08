/**
 * Custom hook for managing user tracks
 * Handles data fetching and track operations with caching support
 */

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService, Track } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { trackCache, CachedTrack } from "@/utils/trackCache";

export const useTracks = (refreshTrigger?: number) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadTracks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setTracks([]);
        return;
      }

      // Сначала пытаемся загрузить треки из кэша
      const userTracks = await ApiService.getUserTracks(user.id);
      
      // Кэшируем загруженные треки
      const tracksToCache: Omit<CachedTrack, 'cached_at'>[] = userTracks
        .filter(track => track.audio_url) // Кэшируем только треки с аудио
        .map(track => ({
          id: track.id,
          title: track.title,
          artist: 'AI Generated', // Можно добавить поле artist в Track интерфейс
          audio_url: track.audio_url!,
          image_url: track.cover_url || undefined,
          duration: track.duration_seconds || undefined,
          genre: track.style_tags?.join(', ') || undefined,
          created_at: track.created_at,
        }));

      if (tracksToCache.length > 0) {
        trackCache.setTracks(tracksToCache);
      }

      setTracks(userTracks);
    } catch (error) {
      console.error("Error loading tracks:", error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить треки",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTrack = async (trackId: string) => {
    try {
      await ApiService.deleteTrack(trackId);
      setTracks(tracks.filter((t) => t.id !== trackId));
      
      // Удаляем трек из кэша
      trackCache.removeTrack(trackId);
      
      toast({
        title: "Трек удалён",
        description: "Ваш трек был успешно удалён",
      });
    } catch (error) {
      console.error("Error deleting track:", error);
      toast({
        title: "Ошибка удаления",
        description: "Не удалось удалить трек",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadTracks();
  }, [refreshTrigger]);

  // Realtime updates: reflect INSERT/UPDATE/DELETE immediately
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let userId: string | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      channel = supabase
        .channel(`tracks-user-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tracks', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              // @ts-ignore payload.new typed as any
              setTracks((prev) => [payload.new as Track, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              // @ts-ignore
              const updated = payload.new as Track;
              setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            } else if (payload.eventType === 'DELETE') {
              // @ts-ignore
              const removed = payload.old as { id: string };
              setTracks((prev) => prev.filter((t) => t.id !== removed.id));
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Fallback polling while there are processing tracks
  useEffect(() => {
    // Check if any tracks need polling
    const needsPolling = tracks.some(track => 
      track.status === 'processing' || 
      track.status === 'pending' ||
      (track.status === 'completed' && !track.audio_url)
    );
    
    if (!needsPolling) return;

    console.log('Starting polling for track updates...');
    const interval = setInterval(() => {
      console.log('Polling for track updates...');
      loadTracks();
    }, 5000);

    return () => {
      console.log('Stopping polling');
      clearInterval(interval);
    };
  }, [tracks]);

  return {
    tracks,
    isLoading,
    deleteTrack,
    refreshTracks: loadTracks,
  };
};
