/**
 * Custom hook for managing user tracks with pagination support
 * Integrates TanStack Query, Supabase realtime, and IndexedDB caching service
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ApiService, type Track, mapTrackRowToTrack } from '@/services/api.service';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger, logError, logInfo, logWarn } from '@/utils/logger';
import { useAuth } from '@/contexts/auth/useAuth';
import { trackCacheService } from '@/services/track-cache.service';
import RealtimeSubscriptionManager from '@/services/realtimeSubscriptionManager';

type TrackRow = Database['public']['Tables']['tracks']['Row'];

interface UseTracksOptions {
  pollingEnabled?: boolean;
  pollingInitialDelay?: number;
  pollingMaxDelay?: number;
  projectId?: string;
  excludeDraftTracks?: boolean;
  pageSize?: number;
}

interface TracksPage {
  cursor: number;
  tracks: Track[];
  hasMore: boolean;
  totalCount: number | null;
}

const DEFAULT_PAGE_SIZE = 20;
const PROCESSING_TRACK_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const STUCK_TRACK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const STUCK_TRACK_CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export const useTracks = (refreshTrigger?: number, options: UseTracksOptions = {}) => {
  const projectId = options.projectId;
  const excludeDraftTracks = options.excludeDraftTracks ?? false;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const pollingEnabled = options.pollingEnabled !== false;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userId, isLoading: isAuthLoading } = useAuth();
  const [isPolling, setIsPolling] = useState(false);

  const queryKey = useMemo(
    () => ['tracks', userId ?? 'guest', projectId ?? null, excludeDraftTracks, pageSize],
    [userId, projectId, excludeDraftTracks, pageSize]
  );

  useEffect(() => {
    void trackCacheService.setActiveUser(userId ?? null);

    if (!userId) {
      queryClient.removeQueries({ queryKey });
    }
  }, [userId, queryClient, queryKey]);

  const fetchTracksPage = useCallback(
    async ({ pageParam = 0, signal }: { pageParam?: number; signal?: AbortSignal }) => {
      if (!userId) {
        return { cursor: pageParam, tracks: [], hasMore: false, totalCount: 0 } satisfies TracksPage;
      }

      const from = pageParam * pageSize;
      const to = from + pageSize - 1;

      let builder = supabase
        .from('tracks')
        .select(
          `
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
        `,
          { count: 'exact' }
        )
        .eq('user_id', userId);

      if (projectId) {
        builder = builder.eq('project_id', projectId);
      }

      if (excludeDraftTracks) {
        builder = builder.neq('status', 'draft');
      }

      builder = builder.order('created_at', { ascending: false }).range(from, to);

      if (signal) {
        builder = builder.abortSignal(signal);
      }

      const { data, error, count } = await builder;

      // ✅ Graceful handling of AbortError (React Query cancels on unmount)
      if (signal?.aborted) {
        logInfo('Tracks request aborted (component unmounted)', 'useTracks', { userId, pageParam });
        return { cursor: pageParam, tracks: [], hasMore: false, totalCount: 0 } satisfies TracksPage;
      }

      if (error) {
        const err = error as Error;
        
        // ✅ Handle AbortError gracefully - expected behavior when component unmounts
        if (err.name === 'AbortError') {
          logInfo('Tracks request aborted (expected)', 'useTracks', { userId, pageParam });
          return { cursor: pageParam, tracks: [], hasMore: false, totalCount: 0 } satisfies TracksPage;
        }
        const msg = (err.message || '').toUpperCase();
        const isTransient =
          msg.includes('ERR_NETWORK_CHANGED') ||
          msg.includes('ERR_CONNECTION_RESET') ||
          msg.includes('ECONNRESET') ||
          msg.includes('ERR_QUIC_PROTOCOL_ERROR') ||
          msg.includes('ETIMEDOUT') ||
          msg.includes('ERR_CONNECTION_TIMED_OUT') ||
          msg.includes('ERR_NAME_NOT_RESOLVED') ||
          msg.includes('FAILED TO FETCH') ||
          msg.includes('ERR_ABORTED') ||
          msg.includes('NETWORKERROR') ||
          msg.includes('ENETUNREACH') ||
          msg.includes('EHOSTUNREACH');

        if (isTransient) {
          logWarn('Транзиентная сетевая ошибка при загрузке треков', 'useTracks', {
            userId,
            message: err.message,
          });
        } else {
          logError('Failed to load tracks', err, 'useTracks', { userId });
        }
        throw err;
      }

      const tracks = (data || []).map((row) => mapTrackRowToTrack(row as any));
      await trackCacheService.cacheTracks(userId, tracks);

      const totalCount = typeof count === 'number' ? count : null;
      const hasMore = totalCount !== null ? to + 1 < totalCount : tracks.length === pageSize;

      logInfo('Tracks page loaded', 'useTracks', {
        page: pageParam,
        count: tracks.length,
        hasMore,
      });

      return {
        cursor: pageParam,
        tracks,
        hasMore,
        totalCount,
      } satisfies TracksPage;
    },
    [excludeDraftTracks, pageSize, projectId, userId]
  );

  const {
    data,
    error,
    isLoading: isQueryLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<TracksPage, Error>({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      fetchTracksPage({ pageParam: typeof pageParam === 'number' ? pageParam : 0, signal }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.cursor + 1 : undefined),
    enabled: Boolean(userId),
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (typeof refreshTrigger === 'number') {
      void refetch();
    }
  }, [refreshTrigger, refetch]);

  useEffect(() => {
    if (!error) return;
    if (error.name === 'AbortError') {
      logger.debug('Tracks request aborted', 'useTracks');
      return;
    }
    const msg = (error.message || '').toUpperCase();
    const isTransient =
      msg.includes('ERR_NETWORK_CHANGED') ||
      msg.includes('ERR_CONNECTION_RESET') ||
      msg.includes('ECONNRESET') ||
      msg.includes('ERR_QUIC_PROTOCOL_ERROR') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('ERR_CONNECTION_TIMED_OUT') ||
      msg.includes('ERR_NAME_NOT_RESOLVED') ||
      msg.includes('FAILED TO FETCH') ||
      msg.includes('ERR_ABORTED') ||
      msg.includes('NETWORKERROR') ||
      msg.includes('ENETUNREACH') ||
      msg.includes('EHOSTUNREACH');
    if (isTransient) {
      logWarn('Пропуск уведомления для временной сетевой ошибки', 'useTracks', {
        message: error.message,
      });
      return;
    }

    toast({
      title: 'Ошибка загрузки',
      description: error.message || 'Не удалось загрузить треки',
      variant: 'destructive',
    });
  }, [error, toast]);

  const tracks = useMemo(() => {
    const result = data?.pages.flatMap((page) => page.tracks) ?? [];
    logInfo('Tracks computed from pages', 'useTracks', {
      pagesCount: data?.pages?.length || 0,
      tracksCount: result.length,
      firstPageTracks: data?.pages?.[0]?.tracks?.length || 0,
    });
    return result;
  }, [data]);

  useEffect(() => {
    if (!pollingEnabled) {
      setIsPolling(false);
      return;
    }

    const shouldPoll = tracks.some(
      (track) =>
        track.status === 'processing' ||
        track.status === 'pending' ||
        (track.status === 'completed' && !track.audio_url)
    );

    setIsPolling(shouldPoll);
  }, [tracks, pollingEnabled]);

  useEffect(() => {
    if (!pollingEnabled || !isPolling) {
      return;
    }

    const getPollingInterval = () => {
      const recentProcessingTracks = tracks.filter((track) => {
        const age = Date.now() - new Date(track.created_at).getTime();
        return (
          (track.status === 'processing' || track.status === 'pending') &&
          age < PROCESSING_TRACK_WINDOW_MS
        );
      });

      return recentProcessingTracks.length > 0 ? 3000 : 5000;
    };

    const pollingInterval = getPollingInterval();

    logInfo('Starting polling for track updates', 'useTracks', {
      processingCount: tracks.filter((t) => t.status === 'processing').length,
      pollingInterval,
    });

    const interval = setInterval(() => {
      logger.debug('Polling for track updates', 'useTracks');
      void refetch();
    }, pollingInterval);

    return () => {
      logInfo('Stopping polling', 'useTracks');
      clearInterval(interval);
    };
  }, [isPolling, tracks, pollingEnabled, refetch]);

  useEffect(() => {
    if (!tracks.some((t) => t.status === 'processing')) return;

    const checkStuckInterval = setInterval(async () => {
      const processingTracks = tracks.filter((t) => t.status === 'processing');
      const stuckTracks = processingTracks.filter((t) => {
        const age = Date.now() - new Date(t.created_at).getTime();
        return age > STUCK_TRACK_THRESHOLD_MS;
      });

      if (stuckTracks.length === 0) return;

      logInfo('Auto-checking stuck tracks', 'useTracks', { count: stuckTracks.length });

      try {
        await supabase.functions.invoke('check-stuck-tracks', {
          body: { trackIds: stuckTracks.map((t) => t.id) },
        });

        setTimeout(() => {
          void refetch();
        }, 3000);
      } catch (invokeError) {
        logError('Failed to check stuck tracks', invokeError as Error, 'useTracks', {
          trackIds: stuckTracks.map((t) => t.id),
        });
      }
    }, STUCK_TRACK_CHECK_INTERVAL_MS);

    return () => clearInterval(checkStuckInterval);
  }, [tracks, refetch]);

  // ✅ FIX P0-2: Use centralized subscription manager to prevent duplicate channels
  useEffect(() => {
    if (!userId) return;

    const handlePayload = (payload: RealtimePostgresChangesPayload<TrackRow>) => {
      const candidate = (payload.new as TrackRow | null) ?? (payload.old as TrackRow | null);

      if (projectId && candidate?.project_id !== projectId) {
        return;
      }

      if (excludeDraftTracks && payload.new && (payload.new as TrackRow).status === 'draft') {
        return;
      }

      queryClient.invalidateQueries({ queryKey });
    };

    // Use centralized manager - automatically handles deduplication and cleanup
    const unsubscribe = RealtimeSubscriptionManager.subscribeToUserTracks(
      userId,
      projectId ?? null,
      handlePayload
    );

    logInfo('Subscribed to user tracks via manager', 'useTracks', { userId, projectId });

    return () => {
      unsubscribe();
      logInfo('Unsubscribed from user tracks', 'useTracks', { userId, projectId });
    };
  }, [userId, projectId, excludeDraftTracks, queryClient, queryKey]);

  const deleteTrack = useCallback(
    async (trackId: string) => {
      try {
        await ApiService.deleteTrack(trackId);

        queryClient.setQueryData<InfiniteData<TracksPage>>(queryKey, (old) => {
          if (!old) return old;

          const nextPages = old.pages.map((page) => ({
            ...page,
            tracks: page.tracks.filter((track) => track.id !== trackId),
          }));

          return { ...old, pages: nextPages };
        });

        await trackCacheService.removeTrack(trackId);

        toast({
          title: 'Трек удалён',
          description: 'Ваш трек был успешно удалён',
        });
      } catch (deleteError) {
        logError('Error deleting track', deleteError as Error, 'useTracks', { trackId });
        toast({
          title: 'Ошибка удаления',
          description: 'Не удалось удалить трек',
          variant: 'destructive',
        });
        throw deleteError;
      }
    },
    [queryClient, queryKey, toast]
  );

  const refreshTracks = useCallback(() => refetch({ cancelRefetch: false }), [refetch]);

  const totalCount = useMemo(() => {
    if (!data?.pages?.length) {
      return null;
    }

    for (let i = data.pages.length - 1; i >= 0; i--) {
      const page = data.pages[i];
      if (page.totalCount !== null) {
        return page.totalCount;
      }
    }

    return null;
  }, [data]);

  return {
    tracks,
    isLoading: isAuthLoading || isQueryLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage: Boolean(hasNextPage),
    fetchNextPage,
    deleteTrack,
    refreshTracks,
    totalCount,
    error,
  };
};
