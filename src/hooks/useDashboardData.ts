import { useEffect, useRef, useState } from "react";
import type { QueryFunctionContext } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/services/api.service";
import { logger } from "@/utils/logger";

export interface DashboardStats {
  total: number;
  processing: number;
  completed: number;
  public: number;
  totalViews: number;
  totalPlays: number;
  totalLikes: number;
  totalDownloads: number;
  trends: {
    views: number;
    plays: number;
    likes: number;
  };
}

export interface QuickInsights {
  mostPlayedTrack: {
    title: string;
    play_count: number;
    cover_url: string | null;
  } | null;
  recentLikes: number;
  recentDownloads: number;
  topGenre: string | null;
}

export interface DashboardData {
  stats: DashboardStats;
  publicTracks: Track[];
  quickInsights: QuickInsights;
}

export const DEFAULT_DASHBOARD_STATS: DashboardStats = {
  total: 0,
  processing: 0,
  completed: 0,
  public: 0,
  totalViews: 0,
  totalPlays: 0,
  totalLikes: 0,
  totalDownloads: 0,
  trends: {
    views: 0,
    plays: 0,
    likes: 0,
  },
};

const DEFAULT_QUICK_INSIGHTS: QuickInsights = {
  mostPlayedTrack: null,
  recentLikes: 0,
  recentDownloads: 0,
  topGenre: null,
};

const DASHBOARD_QUERY_KEY = ["dashboard", "overview"] as const;

const getDefaultDashboardData = (): DashboardData => ({
  stats: { ...DEFAULT_DASHBOARD_STATS },
  publicTracks: [],
  quickInsights: { ...DEFAULT_QUICK_INSIGHTS },
});

type DashboardQueryKey = readonly [
  typeof DASHBOARD_QUERY_KEY[0],
  typeof DASHBOARD_QUERY_KEY[1],
  string | null,
];

const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        logger.error("Error fetching current user", error instanceof Error ? error : new Error(String(error)), "useDashboardData");
        setUser(null);
        return;
      }

      setUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return user;
};

const computeStats = (
  currentWeekTracks: Array<{ 
    status: string | null; 
    is_public: boolean | null;
    view_count: number | null;
    play_count: number | null;
    like_count: number | null;
    download_count: number | null;
  }>,
  previousWeekTracks: Array<{
    view_count: number | null;
    play_count: number | null;
    like_count: number | null;
  }>
): DashboardStats => {
  if (!currentWeekTracks.length) {
    return { ...DEFAULT_DASHBOARD_STATS };
  }

  const baseStats = currentWeekTracks.reduce<DashboardStats>((acc, track) => {
    acc.total += 1;

    if (track.status === "processing") {
      acc.processing += 1;
    } else if (track.status === "completed") {
      acc.completed += 1;
    }

    if (track.is_public) {
      acc.public += 1;
    }

    acc.totalViews += track.view_count || 0;
    acc.totalPlays += track.play_count || 0;
    acc.totalLikes += track.like_count || 0;
    acc.totalDownloads += track.download_count || 0;

    return acc;
  }, { ...DEFAULT_DASHBOARD_STATS });

  // Calculate trends
  const currentViews = currentWeekTracks.reduce((sum, t) => sum + (t.view_count || 0), 0);
  const previousViews = previousWeekTracks.reduce((sum, t) => sum + (t.view_count || 0), 0);
  const currentPlays = currentWeekTracks.reduce((sum, t) => sum + (t.play_count || 0), 0);
  const previousPlays = previousWeekTracks.reduce((sum, t) => sum + (t.play_count || 0), 0);
  const currentLikes = currentWeekTracks.reduce((sum, t) => sum + (t.like_count || 0), 0);
  const previousLikes = previousWeekTracks.reduce((sum, t) => sum + (t.like_count || 0), 0);

  baseStats.trends = {
    views: previousViews > 0 ? Math.round(((currentViews - previousViews) / previousViews) * 100) : 0,
    plays: previousPlays > 0 ? Math.round(((currentPlays - previousPlays) / previousPlays) * 100) : 0,
    likes: previousLikes > 0 ? Math.round(((currentLikes - previousLikes) / previousLikes) * 100) : 0,
  };

  return baseStats;
};

const fetchDashboardData = async ({
  queryKey,
}: QueryFunctionContext<DashboardQueryKey>): Promise<DashboardData> => {
  const [, , userId] = queryKey;

  if (!userId) {
    return getDefaultDashboardData();
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [currentWeekResult, previousWeekResult, publicTracksResult, allUserTracksResult] = await Promise.all([
    supabase
      .from("tracks")
      .select("status, is_public, view_count, play_count, like_count, download_count")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("tracks")
      .select("view_count, play_count, like_count")
      .eq("user_id", userId)
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("tracks")
      .select(`
        *,
        profiles!inner(username, avatar_url)
      `)
      .eq("is_public", true)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("tracks")
      .select("title, play_count, cover_url, genre, like_count, download_count, created_at")
      .eq("user_id", userId)
      .order("play_count", { ascending: false })
      .limit(1),
  ]);

  if (currentWeekResult.error) {
    throw new Error(currentWeekResult.error.message);
  }

  if (publicTracksResult.error) {
    throw new Error(publicTracksResult.error.message);
  }

  const currentWeekTracks = currentWeekResult.data ?? [];
  const previousWeekTracks = previousWeekResult.data ?? [];
  const stats = computeStats(currentWeekTracks, previousWeekTracks);
  const publicTracks = (publicTracksResult.data ?? []) as Track[];

  // Quick insights
  const mostPlayedTrack = allUserTracksResult.data?.[0] 
    ? {
        title: allUserTracksResult.data[0].title,
        play_count: allUserTracksResult.data[0].play_count || 0,
        cover_url: allUserTracksResult.data[0].cover_url,
      }
    : null;

  const recentLikes = currentWeekTracks.reduce((sum, t) => sum + (t.like_count || 0), 0);
  const recentDownloads = currentWeekTracks.reduce((sum, t) => sum + (t.download_count || 0), 0);
  
  // Calculate top genre from all user tracks
  const genreCounts = (allUserTracksResult.data ?? []).reduce((acc, track) => {
    const genre = track.genre || 'Unknown';
    acc[genre] = (acc[genre] || 0) + (track.play_count || 0);
    return acc;
  }, {} as Record<string, number>);
  
  const topGenre = Object.entries(genreCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  const quickInsights: QuickInsights = {
    mostPlayedTrack,
    recentLikes,
    recentDownloads,
    topGenre,
  };

  return {
    stats,
    publicTracks,
    quickInsights,
  };
};

export const useDashboardData = () => {
  const user = useCurrentUser();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;

    if (previousUserId && previousUserId !== userId) {
      queryClient.removeQueries({
        queryKey: [...DASHBOARD_QUERY_KEY, previousUserId],
      });
    }

    if (!userId) {
      queryClient.removeQueries({ queryKey: DASHBOARD_QUERY_KEY, exact: false });
    }

    previousUserIdRef.current = userId;
  }, [userId, queryClient]);

  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, userId] as DashboardQueryKey,
    queryFn: fetchDashboardData,
    enabled: Boolean(userId),
    initialData: getDefaultDashboardData,
  });
};

