import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/services/api.service";

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

const fetchDashboardData = async (): Promise<DashboardData> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  const user = userData?.user;

  if (!user) {
    return {
      stats: DEFAULT_DASHBOARD_STATS,
      publicTracks: [],
    };
  }

  const [userTracksResult, publicTracksResult] = await Promise.all([
    supabase
      .from("tracks")
      .select("status, is_public")
      .eq("user_id", user.id),
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

export const useDashboardData = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardData,
    suspense: false,
  });

