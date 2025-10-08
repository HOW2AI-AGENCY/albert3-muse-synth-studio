/**
 * Custom hook for managing user tracks
 * Handles data fetching and track operations with caching support
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService, Track, mapTrackRowToTrack } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { trackCache, CachedTrack } from "@/utils/trackCache";
import type { Database } from "@/integrations/supabase/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];

export const useTracks = (refreshTrigger?: number) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingAttemptRef = useRef(0);
  const wasPollingRef = useRef(false);

  const {
    pollingEnabled = true,
    pollingInitialDelay = DEFAULT_POLLING_INITIAL_DELAY,
    pollingMaxDelay = DEFAULT_POLLING_MAX_DELAY,
  } = options;

  const normalizedInitialDelay = Math.max(0, pollingInitialDelay);
  const normalizedMaxDelay = Math.max(
    normalizedInitialDelay,
    Math.max(0, pollingMaxDelay)
  );

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

  // Fallback polling while there are processing tracks
  useEffect(() => {
    if (!pollingEnabled) {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
        logInfo('Polling disabled - clearing timer', POLLING_CONTEXT, {
          attempt: pollingAttemptRef.current,
        });
        wasPollingRef.current = false;
      }
      pollingAttemptRef.current = 0;
      return;
    }

    const pendingTracks = tracks.filter(track =>
      track.status === 'processing' ||
      track.status === 'pending' ||
      (track.status === 'completed' && !track.audio_url)
    );

    const pendingMetadata = pendingTracks.map(track => ({
      id: track.id,
      status: track.status,
      hasAudio: Boolean(track.audio_url),
    }));

    if (pendingTracks.length === 0) {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
        logInfo('Stopping track polling - no pending tracks', POLLING_CONTEXT, {
          attempt: pollingAttemptRef.current,
          pendingTracks: pendingMetadata,
        });
        wasPollingRef.current = false;
      } else if (wasPollingRef.current || pollingAttemptRef.current > 0) {
        logInfo('Stopping track polling - no pending tracks', POLLING_CONTEXT, {
          attempt: pollingAttemptRef.current,
          pendingTracks: pendingMetadata,
        });
        wasPollingRef.current = false;
      }
      pollingAttemptRef.current = 0;
      return;
    }

    if (pollingTimeoutRef.current) {
      return;
    }

    const nextAttempt = pollingAttemptRef.current + 1;
    const delay = Math.min(
      normalizedMaxDelay,
      normalizedInitialDelay * Math.pow(2, nextAttempt - 1)
    );

    logInfo('Scheduling track polling', POLLING_CONTEXT, {
      attempt: nextAttempt,
      delay,
      pendingTracks: pendingMetadata,
    });

    const timeoutId = setTimeout(async () => {
      logDebug('Executing track polling', POLLING_CONTEXT, {
        attempt: nextAttempt,
        delay,
        pendingTracks: pendingMetadata,
      });
      pollingTimeoutRef.current = null;
      pollingAttemptRef.current = nextAttempt;
      await loadTracks();
    }, delay);

    pollingTimeoutRef.current = timeoutId;
    wasPollingRef.current = true;

    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [tracks, pollingEnabled, normalizedInitialDelay, normalizedMaxDelay, loadTracks]);

  return {
    tracks,
    isLoading,
    deleteTrack,
    refreshTracks: loadTracks,
  };
};
