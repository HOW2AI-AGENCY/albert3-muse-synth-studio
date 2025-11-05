import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/services/api.service";
import { logger } from "@/utils/logger";

export type SortOption = "newest" | "popular" | "trending" | "most_liked";

interface UsePublicTracksOptions {
  searchQuery?: string;
  genreFilter?: string;
  sortBy?: SortOption;
  pageSize?: number;
}

interface PublicTracksPage {
  tracks: Track[];
  nextCursor: number | null;
}

const QUERY_KEY_BASE = "publicTracks" as const;

/**
 * Hook для загрузки всех публичных треков с infinite scroll
 * Оптимизирован для мобильных устройств с пагинацией
 */
export const usePublicTracks = ({
  searchQuery = "",
  genreFilter = "",
  sortBy = "newest",
  pageSize = 20,
}: UsePublicTracksOptions = {}) => {
  return useInfiniteQuery<PublicTracksPage, Error>({
    queryKey: [QUERY_KEY_BASE, { searchQuery, genreFilter, sortBy, pageSize }],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam as number;
      const to = from + pageSize - 1;

      try {
        let query = supabase
          .from("tracks")
          .select(
            `
            *,
            profiles!inner(id, full_name, avatar_url, username)
          `,
            { count: "exact" }
          )
          .eq("is_public", true)
          .eq("status", "completed")
          .range(from, to);

        // Apply search filter
        if (searchQuery) {
          query = query.or(
            `title.ilike.%${searchQuery}%,profiles.full_name.ilike.%${searchQuery}%,profiles.username.ilike.%${searchQuery}%`
          );
        }

        // Apply genre filter
        if (genreFilter) {
          query = query.eq("genre", genreFilter);
        }

        // Apply sorting
        switch (sortBy) {
          case "newest":
            query = query.order("created_at", { ascending: false });
            break;
          case "popular":
            query = query.order("play_count", { ascending: false, nullsFirst: false });
            break;
          case "trending":
            // Trending = высокие просмотры за последнюю неделю
            query = query
              .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
              .order("view_count", { ascending: false, nullsFirst: false });
            break;
          case "most_liked":
            query = query.order("like_count", { ascending: false, nullsFirst: false });
            break;
          default:
            query = query.order("created_at", { ascending: false });
        }

        const { data, error, count } = await query;

        if (error) {
          logger.error("Failed to fetch public tracks", error, "usePublicTracks", {
            from,
            to,
            searchQuery,
            genreFilter,
            sortBy,
          });
          throw error;
        }

        const tracks = (data ?? []) as Track[];
        const hasMore = count ? from + pageSize < count : false;
        const nextCursor = hasMore ? from + pageSize : null;

        return {
          tracks,
          nextCursor,
        };
      } catch (error) {
        logger.error(
          "Unexpected error in usePublicTracks",
          error instanceof Error ? error : new Error(String(error)),
          "usePublicTracks"
        );
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2, // 2 минуты
    gcTime: 1000 * 60 * 10, // 10 минут
  });
};

/**
 * Hook для получения доступных жанров из публичных треков
 */
export const usePublicGenres = () => {
  return useInfiniteQuery({
    queryKey: ["publicGenres"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("tracks")
          .select("genre")
          .eq("is_public", true)
          .eq("status", "completed")
          .not("genre", "is", null);

        if (error) {
          logger.error("Failed to fetch public genres", error, "usePublicGenres");
          throw error;
        }

        const genres = Array.from(
          new Set((data ?? []).map((t) => t.genre).filter(Boolean))
        ).sort();

        return { genres, nextCursor: null };
      } catch (error) {
        logger.error(
          "Unexpected error in usePublicGenres",
          error instanceof Error ? error : new Error(String(error)),
          "usePublicGenres"
        );
        throw error;
      }
    },
    getNextPageParam: () => undefined,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 минут
  });
};
