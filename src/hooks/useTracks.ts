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

  return {
    tracks,
    isLoading,
    deleteTrack,
    refreshTracks: loadTracks,
  };
};
