/**
 * Custom hook for managing user tracks
 * Handles data fetching and track operations with caching support
 */

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService, Track, mapTrackRowToTrack } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { trackCache, CachedTrack } from "@/utils/trackCache";
import type { Database } from "@/integrations/supabase/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];

interface UseTracksOptions {
  pollingEnabled?: boolean;
  pollingInitialDelay?: number;
  pollingMaxDelay?: number;
}

export const useTracks = (refreshTrigger?: number, _options?: UseTracksOptions) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadTracks = useCallback(async () => {
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
  }, [toast]);

  const deleteTrack = async (trackId: string) => {
    try {
      await ApiService.deleteTrack(trackId);
      setTracks((currentTracks) => currentTracks.filter((t) => t.id !== trackId));

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
  }, [loadTracks, refreshTrigger]);

  // Realtime updates: reflect INSERT/UPDATE/DELETE immediately
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const handlePayload = (payload: RealtimePostgresChangesPayload<TrackRow>) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const newTrack = mapTrackRowToTrack(payload.new);
        setTracks((prev) => [newTrack, ...prev]);
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        const updated = mapTrackRowToTrack(payload.new);
        setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else if (payload.eventType === 'DELETE' && payload.old) {
        const removedId = payload.old.id;
        setTracks((prev) => prev.filter((t) => t.id !== removedId));
      }
    };

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`tracks-user-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tracks', filter: `user_id=eq.${user.id}` },
          handlePayload
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return {
    tracks,
    isLoading,
    deleteTrack,
    refreshTracks: loadTracks,
  };
};
