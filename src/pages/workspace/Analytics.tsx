import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Download, Heart, Eye, Music } from 'lucide-react';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/utils/logger';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TrackStats {
  id: string;
  title: string;
  view_count: number;
  play_count: number;
  like_count: number;
  download_count: number;
  created_at: string;
  genre: string | null;
}

interface OverallStats {
  totalTracks: number;
  totalViews: number;
  totalPlays: number;
  totalLikes: number;
  totalDownloads: number;
}

interface ChartDataPoint {
  date: string;
  views: number;
  plays: number;
  likes: number;
}

interface GenreData {
  name: string;
  value: number;
}

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

const Analytics = () => {
  const [topTracks, setTopTracks] = useState<TrackStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [genreBreakdown, setGenreBreakdown] = useState<GenreData[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<TrackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  type TimeRange = '7d' | '30d' | 'all';
  const isTimeRange = (value: string): value is TimeRange =>
    value === '7d' || value === '30d' || value === 'all';
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Загружаем аналитические данные, оборачиваем в useCallback для корректных зависимостей
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let dateFilter = '';
      if (timeRange === '7d') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (timeRange === '30d') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      let query = supabase
        .from('tracks')
        .select('id, title, view_count, play_count, like_count, download_count, created_at, genre')
        .eq('user_id', user.id)
        .order('view_count', { ascending: false })
        .limit(50);

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

        const stats: OverallStats = {
          totalTracks: tracksData.length,
          totalViews: tracksData.reduce((sum, t) => sum + (t.view_count || 0), 0),
          totalPlays: tracksData.reduce((sum, t) => sum + (t.play_count || 0), 0),
          totalLikes: tracksData.reduce((sum, t) => sum + (t.like_count || 0), 0),
          totalDownloads: tracksData.reduce((sum, t) => sum + (t.download_count || 0), 0),
        };
        setOverallStats(stats);

        // Generate chart data by grouping by date
        const dailyStats: Record<string, ChartDataPoint> = {};
        tracksData.forEach(track => {
          const date = new Date(track.created_at).toLocaleDateString('ru-RU', {
            month: 'short',
            day: 'numeric',
          });
          if (!dailyStats[date]) {
            dailyStats[date] = { date, views: 0, plays: 0, likes: 0 };
          }
          dailyStats[date].views += track.view_count || 0;
          dailyStats[date].plays += track.play_count || 0;
          dailyStats[date].likes += track.like_count || 0;
        });
        setChartData(Object.values(dailyStats).slice(-14)); // Last 14 days

        // Genre breakdown
        const genreCounts: Record<string, number> = {};
        tracksData.forEach(track => {
          const genre = track.genre || 'Unknown';
          genreCounts[genre] = (genreCounts[genre] || 0) + (track.play_count || 0);
        });
        setGenreBreakdown(
          Object.entries(genreCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7)
        );
      }
    } catch (error) {
      logger.error('Failed to fetch analytics', error as Error, 'Analytics', { timeRange });
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);


  const exportToCSV = () => {
    const headers = ['Track ID', 'Title', 'Views', 'Plays', 'Likes', 'Downloads', 'Genre', 'Created At'];
    const rows = topTracks.map(track => [
      track.id,
      `"${track.title.replace(/"/g, '""')}"`,
      track.view_count,
      track.play_count,
      track.like_count,
      track.download_count,
      track.genre || '',
      track.created_at,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Аналитика</h1>
          <p className="text-muted-foreground mt-1">Статистика ваших треков</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
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
            <div
              data-testid="analytics-total-views"
              className="text-2xl font-bold text-gradient-primary"
            >
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
            <div
              data-testid="analytics-total-plays"
              className="text-2xl font-bold text-gradient-primary"
            >
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

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Динамика активности</CardTitle>
            <CardDescription>Просмотры, прослушивания и лайки за период</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#3b82f6" 
                  name="Просмотры"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="plays" 
                  stroke="#10b981" 
                  name="Прослушивания"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="likes" 
                  stroke="#ef4444" 
                  name="Лайки"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Genre Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Распределение по жанрам</CardTitle>
            <CardDescription>Топ жанров по прослушиваниям</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genreBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genreBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Tracks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Топ треки по популярности
          </CardTitle>
          <CardDescription>Самые популярные треки за выбранный период (кликните для деталей)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topTracks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Нет данных для отображения
              </p>
            ) : (
              topTracks.slice(0, 10).map((track, index) => (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
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

      {/* Track Detail Modal */}
      <Dialog open={!!selectedTrack} onOpenChange={() => setSelectedTrack(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTrack?.title}</DialogTitle>
          </DialogHeader>

          {selectedTrack && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      Просмотры
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedTrack.view_count}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Прослушивания
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedTrack.play_count}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Лайки
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedTrack.like_count}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Download className="h-4 w-4 text-purple-500" />
                      Скачивания
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedTrack.download_count}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Rate */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gradient-primary">
                    {selectedTrack.view_count > 0
                      ? ((selectedTrack.play_count / selectedTrack.view_count) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Прослушивания / Просмотры
                  </p>
                </CardContent>
              </Card>

              {/* Additional Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Жанр:</span>
                  <span className="font-medium">{selectedTrack.genre || 'Не указан'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Создан:</span>
                  <span className="font-medium">
                    {new Date(selectedTrack.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analytics;
