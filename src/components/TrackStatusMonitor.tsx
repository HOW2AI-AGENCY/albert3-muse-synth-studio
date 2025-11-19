import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock } from '@/utils/iconImports';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface TrackStatus {
  id: string;
  title: string;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export const TrackStatusMonitor = ({ userId }: { userId: string }) => {
  const [tracks, setTracks] = useState<TrackStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const loadProcessingTracks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, status, created_at, metadata')
        .eq('user_id', userId)
        .eq('status', 'processing')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTracks((data || []) as TrackStatus[]);
    } catch (error) {
      logger.error('Error loading tracks', error instanceof Error ? error : new Error(String(error)), 'TrackStatusMonitor', { userId });
      toast.error('Ошибка загрузки треков');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const checkStuckTracks = useCallback(async () => {
    setChecking(true);
    try {
      const { data, error } = await SupabaseFunctions.invoke('check-stuck-tracks');
      
      if (error) throw error;
      
      toast.success('Проверка завершена', {
        description: `Проверено треков: ${(data as any)?.checkedCount || 0}`
      });
      
      await loadProcessingTracks();
    } catch (error) {
      logger.error('Error checking stuck tracks', error instanceof Error ? error : new Error(String(error)), 'TrackStatusMonitor');
      toast.error('Ошибка проверки треков');
    } finally {
      setChecking(false);
    }
  }, [loadProcessingTracks]);

  useEffect(() => {
    loadProcessingTracks();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadProcessingTracks, 30000);
    
    return () => clearInterval(interval);
  }, [loadProcessingTracks]);

  if (tracks.length === 0 && !loading) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Треки в обработке ({tracks.length})
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProcessingTracks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStuckTracks}
            disabled={checking}
          >
            {checking ? 'Проверка...' : 'Проверить все'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tracks.map((track) => {
          const age = Math.floor((Date.now() - new Date(track.created_at).getTime()) / 60000);
          const isStuck = age > 5;
          
          return (
            <div
              key={track.id}
              className="flex items-center justify-between p-2 border rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{track.title}</p>
                <p className="text-xs text-muted-foreground">
                  {age < 60 ? `${age} мин назад` : `${Math.floor(age / 60)} ч назад`}
                </p>
                {track.metadata && typeof track.metadata === 'object' && 'suno_task_id' in track.metadata && (
                  <p className="text-xs text-muted-foreground">
                    Task: {String(track.metadata.suno_task_id).substring(0, 8)}...
                  </p>
                )}
              </div>
              <Badge variant={isStuck ? 'destructive' : 'default'}>
                {isStuck ? 'Застрял' : 'В процессе'}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
