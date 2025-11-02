/**
 * 📈 Admin Monitoring Tab
 * Перенесенный функционал из Monitoring.tsx
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Loader2,
  RefreshCw,
  Download
} from '@/utils/iconImports';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export function AdminMonitoringTab() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const { data: healthStatus, isLoading: healthLoading, refetch: refetchHealth } = useServiceHealth();

  const { data: stuckTracks, isLoading: stuckLoading } = useQuery({
    queryKey: ['stuck-tracks'],
    queryFn: async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, status, created_at, provider, user_id')
        .eq('status', 'processing')
        .lt('created_at', tenMinutesAgo)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  const { data: failedTracks, isLoading: failedLoading } = useQuery({
    queryKey: ['failed-tracks', timeRange],
    queryFn: async () => {
      const timeRanges = { '1h': 1, '24h': 24, '7d': 24 * 7 };
      const hoursAgo = new Date(Date.now() - timeRanges[timeRange] * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, status, error_message, created_at, provider')
        .eq('status', 'failed')
        .gte('created_at', hoursAgo)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });

  const { data: generationMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['generation-metrics', timeRange],
    queryFn: async () => {
      const timeRanges = { '1h': 1, '24h': 24, '7d': 24 * 7 };
      const hoursAgo = new Date(Date.now() - timeRanges[timeRange] * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('tracks')
        .select('id, status, created_at, updated_at, provider')
        .gte('created_at', hoursAgo);
      if (error) throw error;

      const total = data.length;
      const completed = data.filter(t => t.status === 'completed').length;
      const failed = data.filter(t => t.status === 'failed').length;
      const processing = data.filter(t => t.status === 'processing' || t.status === 'pending').length;

      const completedTracks = data.filter(t => t.status === 'completed' && t.updated_at);
      const avgDuration = completedTracks.length > 0
        ? completedTracks.reduce((sum, t) => {
            const duration = new Date(t.updated_at!).getTime() - new Date(t.created_at).getTime();
            return sum + duration;
          }, 0) / completedTracks.length
        : 0;

      const byProvider = {
        suno: data.filter(t => t.provider === 'suno').length,
        mureka: data.filter(t => t.provider === 'mureka').length,
      };

      return {
        total,
        completed,
        failed,
        processing,
        avgDuration: Math.round(avgDuration / 1000),
        successRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
        byProvider,
      };
    },
    refetchInterval: 60_000,
  });

  const exportToCSV = () => {
    if (!failedTracks) return;
    const csv = [
      ['Track ID', 'Title', 'Provider', 'Error', 'Created At'].join(','),
      ...failedTracks.map(t => [
        t.id,
        `"${t.title}"`,
        t.provider,
        `"${t.error_message || 'N/A'}"`,
        t.created_at,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed-tracks-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Health Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Статус провайдеров
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchHealth()}
              disabled={healthLoading}
            >
              {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  healthStatus?.suno.status === 'operational' ? 'bg-green-500' :
                  healthStatus?.suno.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium">Suno API</p>
                  <p className="text-xs text-muted-foreground">
                    {healthStatus?.suno.lastChecked 
                      ? `Проверено ${formatDistanceToNow(healthStatus.suno.lastChecked, { addSuffix: true, locale: ru })}`
                      : 'Загрузка...'}
                  </p>
                </div>
              </div>
              {healthStatus?.suno.balance?.credits != null && (
                <Badge variant="outline">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {healthStatus.suno.balance.credits.toFixed(2)}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  healthStatus?.mureka.status === 'operational' ? 'bg-green-500' :
                  healthStatus?.mureka.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium">Mureka API</p>
                  <p className="text-xs text-muted-foreground">
                    {healthStatus?.mureka.lastChecked 
                      ? `Проверено ${formatDistanceToNow(healthStatus.mureka.lastChecked, { addSuffix: true, locale: ru })}`
                      : 'Загрузка...'}
                  </p>
                </div>
              </div>
              {healthStatus?.mureka.balance?.credits != null && (
                <Badge variant="outline">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {healthStatus.mureka.balance.credits.toFixed(2)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Всего генераций</CardDescription>
            <CardTitle className="text-3xl">
              {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : generationMetrics?.total || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Успешно завершено</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                <>
                  {generationMetrics?.completed || 0}
                  <Badge variant="outline" className="text-xs">
                    {generationMetrics?.successRate}%
                  </Badge>
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Средняя длительность</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                <>
                  <Clock className="h-6 w-6 text-muted-foreground" />
                  {generationMetrics?.avgDuration || 0}с
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ошибки</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : generationMetrics?.failed || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stuck" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="stuck" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Застрявшие ({stuckTracks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="failed" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Ошибки ({failedTracks?.length || 0})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Экспорт CSV
            </Button>
            <TabsList>
              <TabsTrigger value="1h" onClick={() => setTimeRange('1h')}>1ч</TabsTrigger>
              <TabsTrigger value="24h" onClick={() => setTimeRange('24h')}>24ч</TabsTrigger>
              <TabsTrigger value="7d" onClick={() => setTimeRange('7d')}>7д</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="stuck">
          <Card>
            <CardHeader>
              <CardTitle>Застрявшие треки</CardTitle>
              <CardDescription>Треки в обработке более 10 минут</CardDescription>
            </CardHeader>
            <CardContent>
              {stuckLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : stuckTracks && stuckTracks.length > 0 ? (
                <div className="space-y-2">
                  {stuckTracks.map((track) => (
                    <div key={track.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{track.title}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {track.id} • {track.provider}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {formatDistanceToNow(new Date(track.created_at), { addSuffix: true, locale: ru })}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">Нет застрявших треков</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle>Ошибки генерации</CardTitle>
              <CardDescription>
                Треки с ошибками за {timeRange === '1h' ? 'час' : timeRange === '24h' ? '24 часа' : '7 дней'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {failedLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : failedTracks && failedTracks.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {failedTracks.map((track) => (
                    <div key={track.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{track.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {track.provider} • {formatDistanceToNow(new Date(track.created_at), { addSuffix: true, locale: ru })}
                          </p>
                        </div>
                        <Badge variant="destructive">Failed</Badge>
                      </div>
                      {track.error_message && (
                        <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                          {track.error_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">Нет ошибок</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
