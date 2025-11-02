/**
 * 📊 Analytics Tab for Settings
 * Перенесенный функционал из Analytics.tsx
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Download, Heart, Eye, Music } from '@/utils/iconImports';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
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

type TimeRange = '7d' | '30d' | 'all';

export function AnalyticsTab() {
  const [topTracks, setTopTracks] = useState<TrackStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [genreBreakdown, setGenreBreakdown] = useState<GenreData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
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
        setChartData(Object.values(dailyStats).slice(-14));

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
      logger.error('Failed to fetch analytics', error as Error, 'AnalyticsTab', { timeRange });
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего треков</CardTitle>
            <Music className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalTracks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Просмотры</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalViews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прослушивания</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalPlays || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Лайки</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalLikes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Скачивания</CardTitle>
            <Download className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats?.totalDownloads || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Динамика активности</CardTitle>
            <CardDescription>Просмотры, прослушивания и лайки за период</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#3b82f6" name="Просмотры" strokeWidth={2} />
                <Line type="monotone" dataKey="plays" stroke="#10b981" name="Прослушивания" strokeWidth={2} />
                <Line type="monotone" dataKey="likes" stroke="#ef4444" name="Лайки" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                  dataKey="value"
                >
                  {genreBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
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
          <CardDescription>Самые популярные треки за выбранный период</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {topTracks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет данных</p>
            ) : (
              topTracks.slice(0, 10).map((track, index) => (
                <div key={track.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{track.title}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Eye className="h-3 w-3" />
                      {track.view_count}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {track.play_count}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Heart className="h-3 w-3 text-red-500" />
                      {track.like_count}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
