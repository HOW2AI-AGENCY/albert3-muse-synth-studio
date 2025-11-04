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
import { logger, logError, logInfo } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { trackCacheService } from '@/services/track-cache.service';

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

      if (error) {
        logError('Failed to load tracks', error as Error, 'useTracks', { userId });
        throw error instanceof Error ? error : new Error('Failed to load tracks');
      }

      const tracks = (data || []).map(mapTrackRowToTrack);
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
    queryFn: ({ pageParam, signal }) => fetchTracksPage({ pageParam, signal }),
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

    toast({
      title: 'Ошибка загрузки',
      description: error.message || 'Не удалось загрузить треки',
      variant: 'destructive',
    });
  }, [error, toast]);

  const tracks = useMemo(
    () => data?.pages.flatMap((page) => page.tracks) ?? [],
    [data]
  );

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

  useEffect(() => {
    if (!userId) return;

    let isSubscribed = true;

    const channelName = `tracks-user-${userId}-project-${projectId ?? 'all'}`;

    const handlePayload = (payload: RealtimePostgresChangesPayload<TrackRow>) => {
      if (!isSubscribed) return;

      const candidate = (payload.new as TrackRow | null) ?? (payload.old as TrackRow | null);

      if (projectId && candidate?.project_id !== projectId) {
        return;
      }

      if (excludeDraftTracks && payload.new && (payload.new as TrackRow).status === 'draft') {
        return;
      }

      queryClient.invalidateQueries({ queryKey });
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracks', filter: `user_id=eq.${userId}` },
        handlePayload
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logInfo('Realtime subscription active', 'useTracks', { channelName });
        }
      });

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel).then(() => {
        logInfo('Realtime channel removed', 'useTracks');
      });
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
