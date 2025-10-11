import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Library, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackCard } from "@/features/tracks";
import { useToast } from "@/hooks/use-toast";
import { normalizeTracks } from "@/utils/trackNormalizer";
import { useDashboardData, DEFAULT_DASHBOARD_STATS } from "@/hooks/useDashboardData";
import { AnalyticsService } from "@/services/analytics.service";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { StatCard } from "@/components/layout/StatCard";
import { ActionTile } from "@/components/layout/ActionTile";
import { EmptyState } from "@/components/layout/EmptyState";
import { logger } from "@/utils/logger";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useDashboardData();
  const stats = data?.stats ?? DEFAULT_DASHBOARD_STATS;
  const publicTracks = useMemo(() => normalizeTracks(data?.publicTracks ?? []), [data?.publicTracks]);

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

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          title="Добро пожаловать"
          description="Создавайте музыку, управляйте проектами и отслеживайте прогресс"
          icon={Music}
        />

        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Всего треков" value={stats.total} />
            <StatCard label="В обработке" value={stats.processing} />
            <StatCard label="Завершено" value={stats.completed} />
            <StatCard label="Публичных" value={stats.public} />
          </div>
        </section>

        <section>
          <div className="grid gap-4 md:grid-cols-3">
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
              title="Настройки аккаунта"
              description="Обновите профиль и параметры рабочей области"
              icon={Settings}
              actionLabel="Открыть настройки"
              onClick={handleSettingsClick}
            />
          </div>
        </section>

        <PageSection
          title="Популярные треки"
          description="Последние публичные релизы сообщества"
          action={
            <Button variant="outline" size="sm" onClick={handleShowAllTracks}>
              Показать все
            </Button>
          }
        >
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <span className="text-sm text-muted-foreground">Загружаем треки...</span>
            </div>
          ) : publicTracks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {publicTracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Пока нет публичных треков"
              description="Поделитесь своим первым релизом, чтобы он появился здесь"
              icon={<Music className="h-10 w-10" />}
            />
          )}
        </PageSection>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
