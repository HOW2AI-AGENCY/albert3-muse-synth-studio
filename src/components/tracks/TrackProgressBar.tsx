import { Progress } from '@/components/ui/progress';
import { Clock, Loader2 } from 'lucide-react';

interface TrackProgressBarProps {
  progress: number; // 0-100
  status: string;
  createdAt: string;
}

export const TrackProgressBar = ({ progress, status, createdAt }: TrackProgressBarProps) => {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const estimatedTotal = 90000; // 90 секунд среднее время генерации
  const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);
  
  const formatTime = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}с`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}м ${remainingSeconds}с`;
  };

  const isProcessing = status === 'processing';
  const isPending = status === 'pending';

  return (
    <div className="space-y-2">
      <Progress 
        value={progress} 
        className="h-2 bg-secondary/20"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
          {isPending && <Clock className="h-3 w-3" />}
          <span>
            {isProcessing 
              ? `${progress}% — генерация`
              : isPending
              ? 'В очереди...'
              : 'Обработка...'}
          </span>
        </div>
        {isProcessing && estimatedRemaining > 0 && (
          <span className="text-xs">
            ~{formatTime(estimatedRemaining)}
          </span>
        )}
      </div>
    </div>
  );
};
