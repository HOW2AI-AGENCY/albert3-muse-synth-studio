import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Download, Heart, Eye, Music } from 'lucide-react';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Badge } from '@/components/ui/badge';

interface TrackStats {
  id: string;
  title: string;
  view_count: number;
  play_count: number;
  like_count: number;
  download_count: number;
  created_at: string;
}

interface OverallStats {
  totalTracks: number;
  totalViews: number;
  totalPlays: number;
  totalLikes: number;
  totalDownloads: number;
}

const Analytics = () => {
  const [topTracks, setTopTracks] = useState<TrackStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  type TimeRange = '7d' | '30d' | 'all';
  const isTimeRange = (value: string): value is TimeRange =>
    value === '7d' || value === '30d' || value === 'all';
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Определяем фильтр по времени
      let dateFilter = '';
      if (timeRange === '7d') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (timeRange === '30d') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      // Получаем топ треки пользователя
      let query = supabase
        .from('tracks')
        .select('id, title, view_count, play_count, like_count, download_count, created_at')
        .eq('user_id', user.id)
        .order('view_count', { ascending: false })
        .limit(10);

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: tracksData } = await query;

      if (tracksData) {
        const normalizedTracks = tracksData.map(track => ({
          ...track,
          view_count: track.view_count ?? 0,
          play_count: track.play_count ?? 0,
          like_count: track.like_count ?? 0,
          download_count: track.download_count ?? 0,
        }));
        setTopTracks(normalizedTracks);

        // Подсчитываем общую статистику
        const stats: OverallStats = {
          totalTracks: tracksData.length,
          totalViews: tracksData.reduce((sum, t) => sum + (t.view_count || 0), 0),
          totalPlays: tracksData.reduce((sum, t) => sum + (t.play_count || 0), 0),
          totalLikes: tracksData.reduce((sum, t) => sum + (t.like_count || 0), 0),
          totalDownloads: tracksData.reduce((sum, t) => sum + (t.download_count || 0), 0),
        };
        setOverallStats(stats);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Аналитика</h1>
          <p className="text-muted-foreground mt-1">Статистика ваших треков</p>
        </div>
        <Tabs
          value={timeRange}
          onValueChange={(value) => {
            if (isTimeRange(value)) {
              setTimeRange(value);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="7d">7 дней</TabsTrigger>
            <TabsTrigger value="30d">30 дней</TabsTrigger>
            <TabsTrigger value="all">Все время</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Общая статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего треков</CardTitle>
            <Music className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gradient-primary">
              {overallStats?.totalTracks || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Просмотры</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gradient-primary">
              {overallStats?.totalViews || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прослушивания</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gradient-primary">
              {overallStats?.totalPlays || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Лайки</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gradient-primary">
              {overallStats?.totalLikes || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Скачивания</CardTitle>
            <Download className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gradient-primary">
              {overallStats?.totalDownloads || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Топ треки */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Топ треки по популярности
          </CardTitle>
          <CardDescription>Самые популярные треки за выбранный период</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topTracks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Нет данных для отображения
              </p>
            ) : (
              topTracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{track.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(track.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Eye className="h-3 w-3" />
                        {track.view_count || 0}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {track.play_count || 0}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        {track.like_count || 0}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Download className="h-3 w-3" />
                        {track.download_count || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
