/**
 * Dashboard - Mobile Optimized
 * Main dashboard with stats, insights and popular tracks
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Library, Settings, Sparkles, Heart, Download, TrendingUp, Eye } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrackCard } from "@/features/tracks";
import { useToast } from "@/hooks/use-toast";
import { normalizeTracks } from "@/utils/trackNormalizer";
import { useDashboardData, DEFAULT_DASHBOARD_STATS } from "@/hooks/useDashboardData";
import { DashboardSkeleton } from "@/components/ui/loading-states";
import { AnalyticsService } from "@/services/analytics.service";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { StatCard } from "@/components/layout/StatCard";
import { ActionTile } from "@/components/layout/ActionTile";
import { EmptyState } from "@/components/layout/EmptyState";
import { logger } from "@/utils/logger";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useDashboardData();
  const stats = data?.stats ?? DEFAULT_DASHBOARD_STATS;
  const quickInsights = data?.quickInsights;
  const publicTracks = useMemo(() => normalizeTracks(data?.publicTracks ?? []), [data?.publicTracks]);
  const isMobile = useIsMobile();

  const [genreFilter, setGenreFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPublicTracks = useMemo(() => {
    let filtered = publicTracks;

    if (genreFilter) {
      filtered = filtered.filter((t) => t.genre === genreFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [publicTracks, genreFilter, searchQuery]);

  const availableGenres = useMemo(() => {
    const genres = new Set(publicTracks.map((t) => t.genre).filter(Boolean));
    return Array.from(genres);
  }, [publicTracks]);

  useEffect(() => {
    if (!publicTracks.length) {
      return;
    }

    publicTracks.forEach((track) => {
      if (track.id) {
        AnalyticsService.recordView(track.id).catch((error) => {
          logger.error('Failed to record dashboard track view', error, 'Dashboard', { trackId: track.id });
        });
      }
    });
  }, [publicTracks]);

  useEffect(() => {
    if (!error) {
      return;
    }

    logger.error("Failed to load dashboard data", error, "Dashboard");
    toast({
      title: "Ошибка",
      description: "Не удалось загрузить данные дашборда",
      variant: "destructive",
    });
  }, [error, toast]);

  const handleGenerateClick = useCallback(() => navigate("/workspace/generate"), [navigate]);
  const handleLibraryClick = useCallback(() => navigate("/workspace/library"), [navigate]);
  const handleSettingsClick = useCallback(() => navigate("/workspace/settings"), [navigate]);
  const handleShowAllTracks = useCallback(() => navigate("/workspace/library"), [navigate]);

  if (isLoading) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          title={isMobile ? "Главная" : "Добро пожаловать"}
          description={isMobile ? undefined : "Создавайте музыку, управляйте проектами и отслеживайте прогресс"}
          icon={Music}
        />

        {/* Stats with trends */}
        <section>
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"
          )}>
            <StatCard 
              label={isMobile ? "Треки" : "Всего треков"}
              value={stats.total}
              isLoading={isLoading}
            />
            <StatCard 
              label={isMobile ? "Просм." : "Просмотры"}
              value={stats.totalViews}
              trend={{ value: stats.trends.views, label: isMobile ? "" : "за неделю" }}
              isLoading={isLoading}
              icon={<Eye className="h-4 w-4" />}
            />
            <StatCard 
              label={isMobile ? "Прослуш." : "Прослушивания"}
              value={stats.totalPlays}
              trend={{ value: stats.trends.plays, label: isMobile ? "" : "за неделю" }}
              isLoading={isLoading}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard 
              label="Лайки"
              value={stats.totalLikes}
              trend={{ value: stats.trends.likes, label: isMobile ? "" : "за неделю" }}
              isLoading={isLoading}
              icon={<Heart className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* Quick Insights */}
        {quickInsights && (
          <PageSection 
            title={isMobile ? "Статистика" : "Быстрая статистика"}
            description={isMobile ? undefined : "Последние тренды и активность"}
          >
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-1" : "md:grid-cols-3"
            )}>
              {/* Most Played Track */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    Самый популярный трек
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {quickInsights.mostPlayedTrack ? (
                    <div className="flex items-center gap-3">
                      {quickInsights.mostPlayedTrack.cover_url && (
                        <img
                          src={quickInsights.mostPlayedTrack.cover_url}
                          className={cn(
                            "rounded-md object-cover",
                            isMobile ? "h-10 w-10" : "h-12 w-12"
                          )}
                          alt=""
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium truncate",
                          isMobile && "text-sm"
                        )}>
                          {quickInsights.mostPlayedTrack.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {quickInsights.mostPlayedTrack.play_count} прослуш.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Нет данных</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    {isMobile ? "Активность" : "Активность за неделю"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500 shrink-0" />
                      <span>+{quickInsights.recentLikes} лайков</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-purple-500 shrink-0" />
                      <span>+{quickInsights.recentDownloads} скачиваний</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Genre */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    {isMobile ? "Топ жанр" : "Популярный жанр"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {quickInsights.topGenre ? (
                    <Badge variant="secondary" className={cn(
                      "px-3 py-1",
                      isMobile ? "text-sm" : "text-base"
                    )}>
                      {quickInsights.topGenre}
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">Нет данных</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </PageSection>
        )}

        {/* Action Tiles */}
        <section>
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-1" : "md:grid-cols-3"
          )}>
            <ActionTile
              title="Создать трек"
              description={isMobile ? "Сгенерировать новую композицию" : "Сгенерируйте новую композицию при помощи AI"}
              icon={Sparkles}
              actionLabel={isMobile ? "Генератор" : "Открыть генератор"}
              onClick={handleGenerateClick}
            />
            <ActionTile
              title={isMobile ? "Библиотека" : "Ваша библиотека"}
              description={isMobile ? "Все сохранённые треки" : "Послушайте и управляйте всеми сохранёнными треками"}
              icon={Library}
              actionLabel={isMobile ? "Открыть" : "Перейти к библиотеке"}
              onClick={handleLibraryClick}
            />
            <ActionTile
              title={isMobile ? "Настройки" : "Настройки аккаунта"}
              description={isMobile ? "Профиль и параметры" : "Обновите профиль и параметры рабочей области"}
              icon={Settings}
              actionLabel={isMobile ? "Открыть" : "Открыть настройки"}
              onClick={handleSettingsClick}
            />
          </div>
        </section>

        {/* Popular Tracks with Filters */}
        <PageSection
          title="Популярные треки"
          description={isMobile ? undefined : "Последние публичные релизы сообщества"}
          action={
            <div className={cn(
              "flex gap-2",
              isMobile ? "flex-col items-stretch" : "flex-row items-center"
            )}>
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  isMobile ? "w-full" : "w-40"
                )}
              />
              {availableGenres.length > 0 && (
                <Select value={genreFilter} onValueChange={setGenreFilter}>
                  <SelectTrigger className={cn(
                    isMobile ? "w-full" : "w-32"
                  )}>
                    <SelectValue placeholder="Жанр" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все</SelectItem>
                    {availableGenres.map((genre) => (
                      <SelectItem key={genre} value={genre || ""}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShowAllTracks}
                className={cn(
                  isMobile && "w-full"
                )}
              >
                Показать все
              </Button>
            </div>
          }
        >
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <span className="text-sm text-muted-foreground">Загружаем треки...</span>
            </div>
          ) : filteredPublicTracks.length > 0 ? (
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3"
            )}>
              {filteredPublicTracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          ) : searchQuery || genreFilter ? (
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить фильтры поиска"
              icon={<Music className={cn(
                isMobile ? "h-8 w-8" : "h-10 w-10"
              )} />}
            />
          ) : (
            <EmptyState
              title="Пока нет публичных треков"
              description={isMobile ? "Поделитесь первым релизом" : "Поделитесь своим первым релизом, чтобы он появился здесь"}
              icon={<Music className={cn(
                isMobile ? "h-8 w-8" : "h-10 w-10"
              )} />}
            />
          )}
        </PageSection>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
