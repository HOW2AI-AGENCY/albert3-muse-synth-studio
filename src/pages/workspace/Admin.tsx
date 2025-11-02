import { useEffect, useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Music, Shield, TrendingUp, Trash2, Settings, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { logger } from '@/utils/logger';
import { AdminMonitoringTab } from '@/components/admin/AdminMonitoringTab';

interface AdminStats {
  totalUsers: number;
  totalTracks: number;
  publicTracks: number;
  totalLikes: number;
}

interface TrackForModeration {
  id: string;
  title: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  like_count: number;
  profiles?: {
    email: string | null;
  };
}

export default function Admin() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tracks, setTracks] = useState<TrackForModeration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creditMode, setCreditMode] = useState<'test' | 'production'>('test');
  const [modeLoading, setModeLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchAdminData();
      fetchCreditMode();
    }
  }, [roleLoading, isAdmin]);

  const fetchCreditMode = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'credit_mode')
        .single();

      if (error) throw error;

      if (data?.value && typeof data.value === 'object' && 'mode' in data.value) {
        setCreditMode(data.value.mode as 'test' | 'production');
      }
    } catch (error) {
      logger.error('Failed to fetch credit mode', error as Error, 'Admin');
    }
  };

  const handleCreditModeChange = async (checked: boolean) => {
    const newMode = checked ? 'production' : 'test';
    setModeLoading(true);

    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value: { 
            mode: newMode, 
            description: newMode === 'test' 
              ? 'Test mode - shared provider balance' 
              : 'Production mode - internal platform credits'
          } 
        })
        .eq('key', 'credit_mode');

      if (error) throw error;

      setCreditMode(newMode);
      toast({
        title: 'Успешно',
        description: `Режим кредитов изменен на ${newMode === 'test' ? 'тестовый' : 'продакшн'}`,
      });
    } catch (error) {
      logger.error('Failed to update credit mode', error as Error, 'Admin');
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить режим кредитов',
        variant: 'destructive',
      });
    } finally {
      setModeLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      // Получаем статистику
      const [usersRes, tracksRes, publicTracksRes, likesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('tracks').select('id', { count: 'exact', head: true }),
        supabase.from('tracks').select('id', { count: 'exact', head: true }).eq('is_public', true),
        supabase.from('track_likes').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalTracks: tracksRes.count || 0,
        publicTracks: publicTracksRes.count || 0,
        totalLikes: likesRes.count || 0,
      });

      // Получаем последние треки для модерации
      const { data: tracksData } = await supabase
        .from('tracks')
        .select('id, title, user_id, is_public, created_at, like_count')
        .order('created_at', { ascending: false })
        .limit(20);

      if (tracksData) {
        // Получаем email для каждого пользователя
        const tracksWithProfiles = await Promise.all(
          tracksData.map(async (track) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', track.user_id)
              .single();
            
            return {
              ...track,
              is_public: track.is_public ?? false,
              like_count: track.like_count ?? 0,
              profiles: profile || { email: 'Unknown' }
            };
          })
        );
        
        setTracks(tracksWithProfiles);
      }
    } catch (error) {
      logger.error('Failed to fetch admin data', error as Error, 'Admin');
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные админ-панели',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот трек?')) return;

    try {
      const { error } = await supabase.from('tracks').delete().eq('id', trackId);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Трек удален',
      });

      fetchAdminData();
    } catch (error) {
      logger.error('Failed to delete track', error as Error, 'Admin', { trackId });
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить трек',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublic = async (trackId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ is_public: !currentStatus })
        .eq('id', trackId);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: `Трек ${!currentStatus ? 'опубликован' : 'скрыт'}`,
      });

      fetchAdminData();
    } catch (error) {
      logger.error('Failed to toggle track visibility', error as Error, 'Admin', { trackId, currentStatus });
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить видимость трека',
        variant: 'destructive',
      });
    }
  };

  if (roleLoading || isLoading) {
    return <LoadingSkeleton />;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Доступ запрещен</CardTitle>
            <CardDescription>У вас нет прав для доступа к админ-панели</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Панель администратора</h1>
          <p className="text-muted-foreground mt-1">Управление пользователями и контентом</p>
        </div>
        <Badge variant="default" className="bg-gradient-primary">
          <Shield className="h-4 w-4 mr-1" />
          Администратор
        </Badge>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gradient-primary">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего треков</CardTitle>
            <Music className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gradient-primary">{stats?.totalTracks || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Публичных треков</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gradient-primary">{stats?.publicTracks || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего лайков</CardTitle>
            <span className="text-2xl">❤️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gradient-primary">{stats?.totalLikes || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tracks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tracks">Треки</TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="h-4 w-4 mr-2" />
            Мониторинг
          </TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Последние треки</CardTitle>
              <CardDescription>Управление контентом пользователей</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{track.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {track.profiles?.email || 'Unknown'}
                        </p>
                        <Badge variant={track.is_public ? 'default' : 'secondary'} className="text-xs">
                          {track.is_public ? 'Публичный' : 'Приватный'}
                        </Badge>
                        {track.like_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            ❤️ {track.like_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={track.is_public ? 'outline' : 'default'}
                        onClick={() => handleTogglePublic(track.id, track.is_public)}
                      >
                        {track.is_public ? 'Скрыть' : 'Опубликовать'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteTrack(track.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <AdminMonitoringTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Credit Mode Settings (перенесенные сверху) */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle>Настройки кредитов</CardTitle>
              </div>
              <CardDescription>
                Управление режимом работы системы кредитов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="credit-mode" className="text-base">
                    Режим работы
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {creditMode === 'test' 
                      ? 'Тестовый режим: общий баланс провайдера для всех пользователей' 
                      : 'Продакшн режим: внутренние кредиты платформы (требует настройки оплаты)'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${creditMode === 'test' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Тест
                  </span>
                  <Switch
                    id="credit-mode"
                    checked={creditMode === 'production'}
                    onCheckedChange={handleCreditModeChange}
                    disabled={modeLoading}
                  />
                  <span className={`text-sm font-medium ${creditMode === 'production' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Продакшн
                  </span>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-accent/50">
                <p className="text-sm text-muted-foreground">
                  <strong>Внимание:</strong> В тестовом режиме все пользователи используют общий баланс API провайдера. 
                  В продакшн режиме будут использоваться внутренние кредиты платформы (требует дополнительной настройки системы оплаты).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
