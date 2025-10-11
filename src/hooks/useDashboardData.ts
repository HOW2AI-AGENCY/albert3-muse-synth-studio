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
}

export interface DashboardData {
  stats: DashboardStats;
  publicTracks: Track[];
}

export const DEFAULT_DASHBOARD_STATS: DashboardStats = {
  total: 0,
  processing: 0,
  completed: 0,
  public: 0,
};

const DASHBOARD_QUERY_KEY = ["dashboard", "overview"] as const;

const getDefaultDashboardData = (): DashboardData => ({
  stats: { ...DEFAULT_DASHBOARD_STATS },
  publicTracks: [],
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

const computeStats = (tracks: { status: string | null; is_public: boolean | null }[]): DashboardStats => {
  if (!tracks.length) {
    return { ...DEFAULT_DASHBOARD_STATS };
  }

  return tracks.reduce<DashboardStats>((acc, track) => {
    acc.total += 1;

    if (track.status === "processing") {
      acc.processing += 1;
    } else if (track.status === "completed") {
      acc.completed += 1;
    }

    if (track.is_public) {
      acc.public += 1;
    }

    return acc;
  }, { ...DEFAULT_DASHBOARD_STATS });
};

const fetchDashboardData = async ({
  queryKey,
}: QueryFunctionContext<DashboardQueryKey>): Promise<DashboardData> => {
  const [, , userId] = queryKey;

  if (!userId) {
    return getDefaultDashboardData();
  }

  const [userTracksResult, publicTracksResult] = await Promise.all([
    supabase
      .from("tracks")
      .select("status, is_public")
      .eq("user_id", userId),
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
  ]);

  if (userTracksResult.error) {
    throw new Error(userTracksResult.error.message);
  }

  if (publicTracksResult.error) {
    throw new Error(publicTracksResult.error.message);
  }

  const userTracks = userTracksResult.data ?? [];
  const stats = computeStats(userTracks);
  const publicTracks = (publicTracksResult.data ?? []) as Track[];

  return {
    stats,
    publicTracks,
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

