import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TrackSyncStatusProps {
  track: {
    id: string;
    status: string;
    created_at: string;
    metadata?: Record<string, any> | null;
  };
}

export const TrackSyncStatus = ({ track }: TrackSyncStatusProps) => {
  const { toast } = useToast();
  
  if (track.status !== 'processing') return null;
  
  const metadata = track.metadata as Record<string, any> | null;
  const hasCallbackError = metadata?.callback_error;
  
  const age = Date.now() - new Date(track.created_at).getTime();
  const ageMinutes = Math.floor(age / 60000);
  
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
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Генерация: {ageMinutes} мин</span>
      </div>
      
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
      
      {ageMinutes > 10 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleCheckStatus}
          className="w-full"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Проверить статус
        </Button>
      )}
    </div>
  );
};
