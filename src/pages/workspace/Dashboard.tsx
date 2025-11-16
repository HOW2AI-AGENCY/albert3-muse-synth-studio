import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Library, Settings, Sparkles, Users, Headphones, Flame } from "@/utils/iconImports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePublicTracks } from "@/hooks/usePublicTracks";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import type { SortOption } from "@/hooks/usePublicTracks";
import { DashboardSkeleton } from "@/components/ui/loading-states";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ParallaxHeader } from "@/components/layout/ParallaxHeader";
import { PageSection } from "@/components/layout/PageSection";
import { StatCard } from "@/components/layout/StatCard";
import { ActionTile } from "@/components/layout/ActionTile";
import { PublicTracksGrid } from "@/components/dashboard/PublicTracksGrid";
import { PublicTracksFilters } from "@/components/dashboard/PublicTracksFilters";
import { logger } from "@/utils/logger";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300); // ✅ Debounce search
  const [genreFilter, setGenreFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Platform stats
  const { data: platformStats, isLoading: isLoadingStats } = usePlatformStats();

  // Public tracks with infinite scroll
  const {
    data: tracksData,
    isLoading: isLoadingTracks,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = usePublicTracks({
    searchQuery: debouncedSearchQuery,
    genreFilter,
    sortBy,
    pageSize: 20,
  });

  // Flatten all pages into single array
  const allTracks = useMemo(() => {
    return tracksData?.pages.flatMap((page) => page.tracks) ?? [];
  }, [tracksData]);

  // Available genres (from platform stats)
  const availableGenres = useMemo(() => {
    return platformStats?.topGenres.map((g) => g.genre) ?? [];
  }, [platformStats]);

  // Error handling — переносим показ тоста из фазы рендера в эффект
  useEffect(() => {
    if (!error) return;
    logger.error("Failed to load public tracks", error, "Dashboard");
    toast({
      title: "Ошибка",
      description: "Не удалось загрузить публичные треки",
      variant: "destructive",
    });
  }, [error, toast]);

  const handleGenerateClick = useCallback(() => navigate("/workspace/generate"), [navigate]);
  const handleLibraryClick = useCallback(() => navigate("/workspace/library"), [navigate]);
  const handleSettingsClick = useCallback(() => navigate("/workspace/settings"), [navigate]);
  const handleTrackClick = useCallback((track: any) => {
    logger.info("Track clicked on dashboard", "Dashboard", { trackId: track.id });
    // TODO: Open track details modal or navigate to track page
  }, []);

  if (isLoadingStats && isLoadingTracks) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <div className="space-y-8">
        <ParallaxHeader>
          <PageHeader
            title="Музыкальное сообщество"
            description="Откройте для себя лучшие треки от талантливых создателей по всему миру"
            icon={Music}
          />
        </ParallaxHeader>

        {/* Platform Stats */}
        <section>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Публичных треков"
              value={platformStats?.totalPublicTracks ?? 0}
              isLoading={isLoadingStats}
              icon={<Music className="h-4 w-4" />}
            />
            <StatCard
              label="Создателей"
              value={platformStats?.totalUsers ?? 0}
              isLoading={isLoadingStats}
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Прослушиваний"
              value={platformStats?.totalPlays.toLocaleString() ?? 0}
              isLoading={isLoadingStats}
              icon={<Headphones className="h-4 w-4" />}
            />
            <StatCard
              label="Новых за неделю"
              value={platformStats?.tracksThisWeek ?? 0}
              isLoading={isLoadingStats}
              icon={<Flame className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* Trending & Top Genres */}
        {platformStats && (
          <section className="grid gap-4 md:grid-cols-2">
            {/* Trending Track */}
            {platformStats.trendingTrack && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">🔥 В тренде сейчас</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {platformStats.trendingTrack.cover_url && (
                      <img
                        src={platformStats.trendingTrack.cover_url}
                        className="h-12 w-12 rounded-md object-cover"
                        alt=""
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{platformStats.trendingTrack.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {platformStats.trendingTrack.view_count.toLocaleString()} просмотров за неделю
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Genres */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Популярные жанры</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {platformStats.topGenres.slice(0, 5).map((genre) => (
                    <Badge
                      key={genre.genre}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setGenreFilter(genre.genre)}
                    >
                      {genre.genre} ({genre.count})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <div className="grid gap-4 sm:grid-cols-3">
            <ActionTile
              title="Создать трек"
              description="Сгенерируйте новую композицию при помощи AI"
              icon={Sparkles}
              actionLabel="Открыть генератор"
              onClick={handleGenerateClick}
            />
            <ActionTile
              title="Ваша библиотека"
              description="Послушайте и управляйте всеми сохранёнными треками"
              icon={Library}
              actionLabel="Перейти к библиотеке"
              onClick={handleLibraryClick}
            />
            <ActionTile
              title="Настройки"
              description="Обновите профиль и параметры рабочей области"
              icon={Settings}
              actionLabel="Открыть настройки"
              onClick={handleSettingsClick}
            />
          </div>
        </section>

        {/* Public Tracks with Filters */}
        <PageSection
          title="Все публичные треки"
          description={`${allTracks.length > 0 ? `${allTracks.length} треков` : "Откройте для себя музыку"} от талантливых создателей`}
          action={
            <PublicTracksFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              genreFilter={genreFilter}
              onGenreChange={setGenreFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              availableGenres={availableGenres}
            />
          }
        >
          <PublicTracksGrid
            tracks={allTracks}
            isLoading={isLoadingTracks}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onLoadMore={fetchNextPage}
            onTrackClick={handleTrackClick}
            emptyTitle={
              searchQuery || genreFilter
                ? "Ничего не найдено"
                : "Пока нет публичных треков"
            }
            emptyDescription={
              searchQuery || genreFilter
                ? "Попробуйте изменить фильтры поиска"
                : "Поделитесь своим первым релизом, чтобы он появился здесь"
            }
          />
        </PageSection>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
