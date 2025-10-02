import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Library, Settings, Sparkles, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Track } from "@/services/api.service";
import { TrackCard } from "@/components/TrackCard";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({ total: 0, processing: 0, completed: 0, public: 0 });
  const [publicTracks, setPublicTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Load user stats
        const { data: userTracks } = await supabase
          .from("tracks")
          .select("*")
          .eq("user_id", user.id);

        if (userTracks) {
          setStats({
            total: userTracks.length,
            processing: userTracks.filter(t => t.status === 'processing').length,
            completed: userTracks.filter(t => t.status === 'completed').length,
            public: userTracks.filter(t => t.is_public).length,
          });
        }
      }

      // Load public tracks
      const { data: tracks } = await supabase
        .from("tracks")
        .select("*")
        .eq("is_public", true)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(6);

      if (tracks) {
        setPublicTracks(tracks as Track[]);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome Card */}
      <Card className="card-glass border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl gradient-text">
            Добро пожаловать в MusicAI Pro! 🎵
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Начните создавать музыку с помощью искусственного интеллекта
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Всего треков</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">В процессе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">{stats.processing}</div>
          </CardContent>
        </Card>
        
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Завершено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Публичных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{stats.public}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-all hover-lift"
          onClick={() => navigate("/workspace/generate")}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Создать трек</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Сгенерируйте новую композицию с помощью AI
            </p>
            <Button className="w-full" variant="hero">
              Перейти
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary/50 transition-all hover-lift"
          onClick={() => navigate("/workspace/library")}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
              <Library className="w-6 h-6 text-secondary" />
            </div>
            <CardTitle>Библиотека</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Просмотрите все ваши треки
            </p>
            <Button variant="outline" className="w-full">
              Перейти
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary/50 transition-all hover-lift"
          onClick={() => navigate("/workspace/settings")}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2">
              <Settings className="w-6 h-6 text-accent" />
            </div>
            <CardTitle>Настройки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Управляйте вашим аккаунтом
            </p>
            <Button variant="outline" className="w-full">
              Перейти
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Public Tracks Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Популярные треки
            </CardTitle>
            <Button variant="ghost" size="sm">
              Показать все
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Загрузка...</p>
            </div>
          ) : publicTracks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicTracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Пока нет публичных треков</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
