import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Music, TrendingUp, Clock, Zap } from 'lucide-react';

interface GenerationMetrics {
  total_generations: number;
  completed: number;
  failed: number;
  pending: number;
  avg_duration_seconds: number;
  success_rate: number;
  model_usage: { model: string; count: number }[];
  reference_audio_rate: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function Metrics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['generation-metrics'],
    queryFn: async () => {
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('status, duration_seconds, metadata, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = tracks?.length || 0;
      const completed = tracks?.filter(t => t.status === 'completed').length || 0;
      const failed = tracks?.filter(t => t.status === 'failed').length || 0;
      const pending = tracks?.filter(t => t.status === 'pending' || t.status === 'processing').length || 0;

      const completedTracks = tracks?.filter(t => t.status === 'completed' && t.created_at && t.updated_at) || [];
      const durations = completedTracks.map(t => {
        const start = new Date(t.created_at!).getTime();
        const end = new Date(t.updated_at!).getTime();
        return (end - start) / 1000;
      });
      const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

      const modelCounts = tracks?.reduce((acc: Record<string, number>, track) => {
        const metadata = track.metadata as Record<string, any> | null;
        const model = metadata?.model_version || 'V3_5';
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {}) || {};

      const modelUsage = Object.entries(modelCounts).map(([model, count]) => ({
        model,
        count: count as number,
      }));

      const referenceAudioCount = tracks?.filter(t => {
        const metadata = t.metadata as Record<string, any> | null;
        return metadata?.has_reference_audio;
      }).length || 0;

      return {
        total_generations: total,
        completed,
        failed,
        pending,
        avg_duration_seconds: Math.round(avgDuration),
        success_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        model_usage: modelUsage,
        reference_audio_rate: total > 0 ? Math.round((referenceAudioCount / total) * 100) : 0,
      } as GenerationMetrics;
    },
    refetchInterval: 30000, // Обновление каждые 30 секунд
  });

  const statusData = metrics ? [
    { name: 'Completed', value: metrics.completed },
    { name: 'Failed', value: metrics.failed },
    { name: 'Pending', value: metrics.pending },
  ] : [];

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Метрики генерации"
          description="Мониторинг производительности и статистика"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Метрики генерации"
        description="Мониторинг производительности и статистика"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего генераций</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_generations}</div>
            <p className="text-xs text-muted-foreground">За все время</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.success_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.completed} успешных из {metrics?.total_generations}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Среднее время</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avg_duration_seconds}s</div>
            <p className="text-xs text-muted-foreground">От запроса до завершения</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reference Audio</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.reference_audio_rate}%</div>
            <p className="text-xs text-muted-foreground">Генераций с референсом</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Распределение по статусам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Использование моделей</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics?.model_usage || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
