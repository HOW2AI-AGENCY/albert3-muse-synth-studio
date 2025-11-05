import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export interface PlatformStats {
  totalPublicTracks: number;
  totalUsers: number;
  totalPlays: number;
  totalLikes: number;
  tracksThisWeek: number;
  topGenres: Array<{ genre: string; count: number }>;
  trendingTrack: {
    id: string;
    title: string;
    cover_url: string | null;
    view_count: number;
  } | null;
}

const DEFAULT_PLATFORM_STATS: PlatformStats = {
  totalPublicTracks: 0,
  totalUsers: 0,
  totalPlays: 0,
  totalLikes: 0,
  tracksThisWeek: 0,
  topGenres: [],
  trendingTrack: null,
};

/**
 * Hook для получения глобальной статистики платформы
 * Показывает общее количество треков, пользователей, активность и т.д.
 */
export const usePlatformStats = () => {
  return useQuery({
    queryKey: ["platformStats"],
    queryFn: async (): Promise<PlatformStats> => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Parallel queries for better performance
        const [
          publicTracksResult,
          usersResult,
          statsResult,
          weekTracksResult,
          genresResult,
          trendingResult,
        ] = await Promise.all([
          // Total public tracks
          supabase
            .from("tracks")
            .select("id", { count: "exact", head: true })
            .eq("is_public", true)
            .eq("status", "completed"),

          // Total users with at least one public track
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true }),

          // Total plays and likes
          supabase
            .from("tracks")
            .select("play_count, like_count")
            .eq("is_public", true)
            .eq("status", "completed"),

          // Tracks this week
          supabase
            .from("tracks")
            .select("id", { count: "exact", head: true })
            .eq("is_public", true)
            .eq("status", "completed")
            .gte("created_at", sevenDaysAgo),

          // Top genres (limit to top 5)
          supabase
            .from("tracks")
            .select("genre")
            .eq("is_public", true)
            .eq("status", "completed")
            .not("genre", "is", null),

          // Trending track (most views this week)
          supabase
            .from("tracks")
            .select("id, title, cover_url, view_count")
            .eq("is_public", true)
            .eq("status", "completed")
            .gte("created_at", sevenDaysAgo)
            .order("view_count", { ascending: false, nullsFirst: false })
            .limit(1)
            .single(),
        ]);

        // Process results
        const totalPublicTracks = publicTracksResult.count ?? 0;
        const totalUsers = usersResult.count ?? 0;
        const tracksThisWeek = weekTracksResult.count ?? 0;

        // Calculate total plays and likes
        const { totalPlays, totalLikes } = (statsResult.data ?? []).reduce(
          (acc, track) => ({
            totalPlays: acc.totalPlays + (track.play_count ?? 0),
            totalLikes: acc.totalLikes + (track.like_count ?? 0),
          }),
          { totalPlays: 0, totalLikes: 0 }
        );

        // Calculate top genres
        const genreCounts = (genresResult.data ?? []).reduce((acc, track) => {
          const genre = track.genre || "Unknown";
          acc[genre] = (acc[genre] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topGenres = Object.entries(genreCounts)
          .map(([genre, count]) => ({ genre, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Trending track
        const trendingTrack = trendingResult.data
          ? {
              id: trendingResult.data.id,
              title: trendingResult.data.title,
              cover_url: trendingResult.data.cover_url,
              view_count: trendingResult.data.view_count ?? 0,
            }
          : null;

        return {
          totalPublicTracks,
          totalUsers,
          totalPlays,
          totalLikes,
          tracksThisWeek,
          topGenres,
          trendingTrack,
        };
      } catch (error) {
        logger.error(
          "Failed to fetch platform stats",
          error instanceof Error ? error : new Error(String(error)),
          "usePlatformStats"
        );
        return DEFAULT_PLATFORM_STATS;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 минут
    gcTime: 1000 * 60 * 15, // 15 минут
  });
};
