/**
 * Custom hook for managing user tracks
 * Handles data fetching and track operations
 */

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService, Track } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";

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

      const userTracks = await ApiService.getUserTracks(user.id);
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
    const hasProcessing = tracks.some((t) => t.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadTracks();
    }, 5000);

    return () => clearInterval(interval);
  }, [tracks]);

  return {
    tracks,
    isLoading,
    deleteTrack,
    refreshTracks: loadTracks,
  };
};
