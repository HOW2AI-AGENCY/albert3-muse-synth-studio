/**
 * Custom hook for managing user tracks
 * Handles data fetching and track operations with caching support
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService, Track, mapTrackRowToTrack } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { trackCacheIDB, CachedTrack } from "@/features/tracks";
import type { Database } from "@/integrations/supabase/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { logger, logInfo, logError, logWarn } from "@/utils/logger";

type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];

interface UseTracksOptions {
  pollingEnabled?: boolean;
  pollingInitialDelay?: number;
  pollingMaxDelay?: number;
  projectId?: string;
  excludeDraftTracks?: boolean; // ✅ НОВОЕ: Исключить draft треки из списка
}

export const useTracks = (refreshTrigger?: number, options?: UseTracksOptions) => {
  const projectId = options?.projectId;
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const lastUserIdRef = useRef<string | null>(null);
  const hasTracksRef = useRef(false);

  const loadTracks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // ✅ FIX: Всегда очищаем треки при отсутствии пользователя
      if (!user) {
        logInfo('No user found, clearing tracks and cache', 'useTracks');
        setTracks([]);
        hasTracksRef.current = false;
        lastUserIdRef.current = null;
        
        // ✅ FIX: Очищаем IndexedDB для предотвращения утечки данных
        try {
          await trackCacheIDB.clearAll();
        } catch (cacheError) {
          logWarn('Failed to clear track cache', 'useTracks', { error: cacheError });
        }
        
        return;
      }

      // ✅ FIX: Проверяем смену пользователя и очищаем старые данные
      if (lastUserIdRef.current && lastUserIdRef.current !== user.id) {
        logInfo('User changed, clearing previous user data', 'useTracks', {
          oldUserId: lastUserIdRef.current,
          newUserId: user.id,
        });
        setTracks([]);
        hasTracksRef.current = false;
        
        // Очищаем кэш предыдущего пользователя
        try {
          await trackCacheIDB.clearAll();
        } catch (cacheError) {
          logWarn('Failed to clear track cache on user switch', 'useTracks', { error: cacheError });
        }
      }

      lastUserIdRef.current = user.id;

      // ✅ ОПТИМИЗАЦИЯ: Загружаем треки с JOINами вместо N+1 запросов
      logInfo('Loading tracks with optimized query', 'useTracks', { userId: user.id, projectId });
      
      let query = supabase
        .from('tracks')
        .select(`
          *,
          track_versions!track_versions_parent_track_id_fkey (
            id,
            variant_index,
            audio_url,
            cover_url,
            duration,
            is_primary_variant,
            is_preferred_variant
          ),
          track_stems (
            id,
            stem_type,
            audio_url,
            separation_mode
          ),
          profiles!tracks_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      // Фильтр по проекту (если передан, показываем только треки этого проекта)
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      // ✅ НОВОЕ: Фильтр для исключения draft треков (если excludeDraftTracks === true)
      if (options?.excludeDraftTracks) {
        query = query.neq('status', 'draft');
      }

      const { data: tracksData, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logError('Failed to load tracks', error as Error, 'useTracks', { userId: user.id });
        throw error;
      }

      // Преобразуем данные в Track[] формат
      const userTracks: Track[] = (tracksData || []).map(mapTrackRowToTrack);
      
      // Кэшируем загруженные треки в IndexedDB
      const tracksToCache: Omit<CachedTrack, 'cached_at'>[] = userTracks
        .filter(track => track.audio_url)
        .map(track => ({
          id: track.id,
          title: track.title,
          artist: 'AI Generated',
          audio_url: track.audio_url!,
          image_url: track.cover_url || undefined,
          duration: track.duration_seconds || undefined,
          genre: track.style_tags?.join(', ') || undefined,
          created_at: track.created_at,
        }));

      if (tracksToCache.length > 0) {
        await trackCacheIDB.setTracks(tracksToCache);
      }
      // Обновляем список, но не затираем ранее загруженные данные пустым ответом
      if (userTracks.length === 0 && hasTracksRef.current) {
        logWarn('Empty track list from API; keeping previous tracks', 'useTracks', { userId: user.id });
      } else {
        setTracks(userTracks);
        hasTracksRef.current = userTracks.length > 0;
      }
      
      logInfo('Tracks loaded successfully', 'useTracks', {
        count: userTracks.length,
        userId: user.id,
      });
    } catch (error) {
      logError("Error loading tracks", error as Error, 'useTracks');
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить треки",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, projectId]);

  const deleteTrack = async (trackId: string) => {
    try {
      await ApiService.deleteTrack(trackId);
      setTracks((currentTracks) => currentTracks.filter((t) => t.id !== trackId));

      // Удаляем трек из IndexedDB кэша
      await trackCacheIDB.removeTrack(trackId);
      
      toast({
        title: "Трек удалён",
        description: "Ваш трек был успешно удалён",
      });
    } catch (error) {
      logError("Error deleting track", error as Error, 'useTracks', { trackId });
      toast({
        title: "Ошибка удаления",
        description: "Не удалось удалить трек",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadTracks();
  }, [loadTracks, refreshTrigger, projectId]);

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

  const [isPolling, setIsPolling] = useState(false);

  // Fallback polling while there are processing tracks
  useEffect(() => {
    const shouldPoll = tracks.some(track =>
      track.status === 'processing' ||
      track.status === 'pending' ||
      (track.status === 'completed' && !track.audio_url)
    );
    setIsPolling(shouldPoll);
  }, [tracks]);

  useEffect(() => {
    if (!isPolling) {
      return;
    }

    // ✅ Adaptive polling: быстрее если есть новые треки (< 2 мин)
    const getPollingInterval = () => {
      const newTracks = tracks.filter(t => {
        const age = Date.now() - new Date(t.created_at).getTime();
        return (t.status === 'processing' || t.status === 'pending') && age < 2 * 60 * 1000; // < 2 minutes
      });
      
      return newTracks.length > 0 ? 3000 : 5000; // 3s for new, 5s for old
    };

    const pollingInterval = getPollingInterval();
    
    logInfo('Starting polling for track updates', 'useTracks', {
      processingCount: tracks.filter(t => t.status === 'processing').length,
      pollingInterval,
    });
    
    const interval = setInterval(() => {
      logger.debug('Polling for track updates', 'useTracks');
      loadTracks();
    }, pollingInterval);

    return () => {
      logInfo('Stopping polling', 'useTracks');
      clearInterval(interval);
    };
  }, [isPolling, tracks, loadTracks]);

  // ✅ Auto-check stuck tracks every 2 minutes
  useEffect(() => {
    if (!tracks.some(t => t.status === 'processing')) return;
    
    const checkStuckInterval = setInterval(async () => {
      const processingTracks = tracks.filter(t => t.status === 'processing');
      const stuckTracks = processingTracks.filter(t => {
        const age = Date.now() - new Date(t.created_at).getTime();
        return age > 10 * 60 * 1000; // older than 10 minutes
      });
      
      if (stuckTracks.length > 0) {
        logInfo('Auto-checking stuck tracks', 'useTracks', { count: stuckTracks.length });
        
        try {
          await supabase.functions.invoke('check-stuck-tracks', {
            body: { trackIds: stuckTracks.map(t => t.id) }
          });
          
          // Reload tracks after sync
          setTimeout(() => loadTracks(), 3000);
        } catch (error) {
          logError('Failed to check stuck tracks', error as Error, 'useTracks', {
            trackIds: stuckTracks.map(t => t.id)
          });
        }
      }
    }, 2 * 60 * 1000); // every 2 minutes
    
    return () => clearInterval(checkStuckInterval);
  }, [tracks, loadTracks]);

  return {
    tracks,
    isLoading,
    deleteTrack,
    refreshTracks: loadTracks,
  };
};
