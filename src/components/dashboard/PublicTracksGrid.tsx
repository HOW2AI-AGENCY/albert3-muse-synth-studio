import { memo, useCallback } from "react";
import { useInfiniteScroll } from "@/hooks/useIntersectionObserver";
import { TrackCard } from "@/features/tracks";
import { TrackCardMobile } from "@/features/tracks/components/TrackCardMobile";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BREAKPOINTS } from "@/config/breakpoints.config";
import { Loader2 } from "@/utils/iconImports";
import { EmptyState } from "@/components/layout/EmptyState";
import { Music } from "@/utils/iconImports";
import type { Track } from "@/services/api.service";
import { cn } from "@/lib/utils";

interface PublicTracksGridProps {
  tracks: Track[];
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  onTrackClick?: (track: Track) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export const PublicTracksGrid = memo(({
  tracks,
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  onLoadMore,
  onTrackClick,
  emptyTitle = "Пока нет публичных треков",
  emptyDescription = "Поделитесь своим первым релизом, чтобы он появился здесь",
  className,
}: PublicTracksGridProps) => {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && onLoadMore) {
      onLoadMore();
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  // Use infinite scroll hook
  const { ref: loadMoreRef } = useInfiniteScroll(
    handleLoadMore,
    hasNextPage && !isFetchingNextPage,
    0.1
  );

  // Initial loading state
  if (isLoading && tracks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">
          Загружаем треки...
        </span>
      </div>
    );
  }

  // Empty state
  if (tracks.length === 0 && !isLoading) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<Music className="h-10 w-10" />}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mobile: List view with compact cards */}
      {isMobile ? (
        <div className="space-y-2">
          {tracks.map((track) => (
            <TrackCardMobile
              key={track.id}
              track={track as any}
              onClick={() => onTrackClick?.(track)}
            />
          ))}
        </div>
      ) : (
        /* Desktop/Tablet: Grid view */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              onClick={() => onTrackClick?.(track)}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-8"
        >
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Загружаем ещё...
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Прокрутите вниз, чтобы загрузить больше
            </span>
          )}
        </div>
      )}

      {/* End of results */}
      {!hasNextPage && tracks.length > 0 && (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Показаны все треки ({tracks.length})
          </p>
        </div>
      )}
    </div>
  );
});

PublicTracksGrid.displayName = "PublicTracksGrid";
