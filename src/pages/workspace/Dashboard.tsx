import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Library, Settings, Sparkles, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo } from "react";
import { TrackCard } from "@/features/tracks";
import { useToast } from "@/hooks/use-toast";
import { normalizeTracks } from "@/utils/trackNormalizer";
import { useDashboardData, DEFAULT_DASHBOARD_STATS } from "@/hooks/useDashboardData";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useDashboardData();
  const stats = data?.stats ?? DEFAULT_DASHBOARD_STATS;
  const publicTracks = useMemo(() => normalizeTracks(data?.publicTracks ?? []), [data?.publicTracks]);

  useEffect(() => {
    if (!error) {
      return;
    }

    console.error("Error loading dashboard data:", error);
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
    <div className="p-4 md:p-6 space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="text-center space-y-4 animate-slide-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-float">
          <Music className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-gradient-primary">
          Добро пожаловать в MusicAI Pro
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Создавайте невероятную музыку с помощью искусственного интеллекта
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-scale-in">
        <Card variant="modern" className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Всего треков</div>
          </CardContent>
        </Card>
        
        <Card variant="modern" className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-secondary">{stats.processing}</div>
            <div className="text-sm text-muted-foreground">В обработке</div>
          </CardContent>
        </Card>
        
        <Card variant="modern" className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Завершено</div>
          </CardContent>
        </Card>
        
        <Card variant="modern" className="text-center">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gradient-secondary">{stats.public}</div>
            <div className="text-sm text-muted-foreground">Публичных</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card 
          variant="interactive"
          className="cursor-pointer hover:border-primary/50 transition-all hover-lift animate-scale-in"
          onClick={handleGenerateClick}
          style={{ animationDelay: '0.1s' }}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-2 animate-pulse-glow">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-gradient-primary">Создать трек</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Сгенерируйте новую композицию с помощью AI
            </p>
            <Button variant="hero" className="w-full">
              Перейти
            </Button>
          </CardContent>
        </Card>

        <Card 
          variant="interactive"
          className="cursor-pointer hover:border-secondary/50 transition-all hover-lift animate-scale-in"
          onClick={handleLibraryClick}
          style={{ animationDelay: '0.2s' }}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center mb-2">
              <Library className="w-6 h-6 text-secondary" />
            </div>
            <CardTitle className="text-gradient-secondary">Библиотека</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Просмотрите все ваши треки
            </p>
            <Button variant="glow" className="w-full">
              Перейти
            </Button>
          </CardContent>
        </Card>

        <Card 
          variant="interactive"
          className="cursor-pointer hover:border-accent/50 transition-all hover-lift animate-scale-in"
          onClick={handleSettingsClick}
          style={{ animationDelay: '0.3s' }}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center mb-2">
              <Settings className="w-6 h-6 text-accent" />
            </div>
            <CardTitle>Настройки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Управляйте вашим аккаунтом
            </p>
            <Button variant="modern" className="w-full">
              Перейти
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Public Tracks Feed */}
      <Card variant="glass" className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-shimmer">Популярные треки</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="hover:text-primary" onClick={handleShowAllTracks}>
              Показать все
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Загружаем треки...</p>
            </div>
          ) : publicTracks.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicTracks.map((track, index) => (
                <div
                  key={track.id}
                  className="animate-scale-in"
                  style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                >
                  <TrackCard track={track} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Пока нет публичных треков</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
