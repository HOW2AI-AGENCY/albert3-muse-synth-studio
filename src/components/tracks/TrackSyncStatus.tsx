import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TrackSyncStatusProps {
  track: {
    id: string;
    status: string;
    created_at: string;
    provider?: string;
    metadata?: Record<string, any> | null;
  };
}

export const TrackSyncStatus = ({ track }: TrackSyncStatusProps) => {
  const { toast } = useToast();
  
  if (track.status !== 'processing') return null;
  
  const metadata = track.metadata as Record<string, any> | null;
  const hasCallbackError = metadata?.callback_error;
  const pollingAttempts = metadata?.polling_attempts || 0;
  const stageDescription = metadata?.stage_description;
  
  const age = Date.now() - new Date(track.created_at).getTime();
  const ageMinutes = Math.floor(age / 60000);
  
  // ✅ TASK D: Stuck track recovery actions
  const handleCheckStatus = async () => {
    try {
      toast({ title: 'Проверяем статус трека...' });
      
      await supabase.functions.invoke('check-stuck-tracks', {
        body: { trackIds: [track.id] }
      });
      
      toast({ 
        title: 'Проверка завершена', 
        description: 'Статус трека будет обновлён через несколько секунд' 
      });
    } catch (error) {
      toast({ 
        title: 'Ошибка проверки', 
        description: 'Не удалось проверить статус трека',
        variant: 'destructive'
      });
    }
  };

  const handleCancelTrack = async () => {
    try {
      await supabase
        .from('tracks')
        .update({ status: 'failed', error_message: 'Отменено пользователем' })
        .eq('id', track.id);
      
      toast({ 
        title: 'Трек отменён', 
        description: 'Генерация остановлена' 
      });
    } catch (error) {
      toast({ 
        title: 'Ошибка отмены', 
        description: 'Не удалось отменить трек',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Генерация: {ageMinutes} мин</span>
        </div>
        
        {/* ✅ TASK B: Show Mureka polling progress */}
        {track.provider === 'mureka' && pollingAttempts > 0 && (
          <Badge variant="outline" className="text-[10px]">
            Попытка {pollingAttempts}/60
          </Badge>
        )}
      </div>

      {/* ✅ TASK B: Show stage for Mureka */}
      {stageDescription && (
        <p className="text-[10px] text-primary">
          {stageDescription}
        </p>
      )}
      
      {hasCallbackError && (
        <Alert variant="destructive" className="py-2 px-3">
          <AlertTriangle className="w-3 h-3" />
          <AlertDescription className="text-xs">
            Ошибка синхронизации. Проверяем статус...
          </AlertDescription>
        </Alert>
      )}
      
      {ageMinutes > 5 && !hasCallbackError && (
        <p className="text-xs text-muted-foreground">
          Генерация занимает больше обычного
        </p>
      )}
      
      {/* ✅ TASK D: Recovery actions */}
      {ageMinutes > 10 && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckStatus}
            className="flex-1"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Проверить
          </Button>
          
          {ageMinutes > 15 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleCancelTrack}
              className="flex-1"
            >
              <X className="w-3 h-3 mr-1" />
              Отменить
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
