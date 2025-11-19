import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import { useAudioUpscale, useAudioUpscaleStatus } from '@/hooks/useAudioUpscale';
import { toast } from 'sonner';

interface UpscaleAudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackTitle: string;
  audioUrl: string | null;
}

export const UpscaleAudioDialog = ({
  open,
  onOpenChange,
  trackTitle,
  audioUrl
}: UpscaleAudioDialogProps) => {
  const [ddimSteps, setDdimSteps] = useState(50);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);

  const { mutate: upscale, isPending: isStarting } = useAudioUpscale();
  const { data: statusData, isLoading: isPolling } = useAudioUpscaleStatus(
    predictionId,
    !!predictionId
  );

  // Handle status updates
  useEffect(() => {
    const status = statusData as any;
    if (status?.status === 'succeeded' && status?.output) {
      setUpscaledUrl(status.output as string);
      toast.success('Качество аудио улучшено! 🎉');
    } else if (status?.status === 'failed') {
      toast.error('Не удалось улучшить качество аудио');
      setPredictionId(null);
    }
  }, [statusData]);

  const handleUpscale = () => {
    if (!audioUrl) {
      toast.error('Аудио URL не найден');
      return;
    }

    upscale(
      {
        inputFileUrl: audioUrl,
        ddimSteps,
        guidanceScale,
        truncatedBatches: true, // For long audio
      },
      {
        onSuccess: (data) => {
          if (data.predictionId) {
            setPredictionId(data.predictionId);
          }
        },
      }
    );
  };

  const handleDownload = async () => {
    if (!upscaledUrl) return;

    try {
      const response = await fetch(upscaledUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trackTitle}_upscaled_48khz.wav`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Файл загружен!');
    } catch (error) {
      toast.error('Ошибка при скачивании файла');
    }
  };

  const handleClose = () => {
    setPredictionId(null);
    setUpscaledUrl(null);
    setDdimSteps(50);
    setGuidanceScale(3.5);
    onOpenChange(false);
  };

  const status = statusData as any;
  const isProcessing = isStarting || isPolling || (predictionId && status?.status === 'processing');
  const progress = status?.status === 'processing'
    ? ((statusData as any)?.progress || 0) * 100 
    : isStarting 
    ? 10 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Повышение качества аудио
          </DialogTitle>
          <DialogDescription>
            Улучшите качество трека до 48kHz с помощью AI модели AudioSR
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Track Info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{trackTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Будет улучшено до 48kHz WAV
            </p>
          </div>

          {!upscaledUrl && !isProcessing && (
            <>
              {/* DDIM Steps */}
              <div className="space-y-2">
                <Label>
                  Шаги инференса (DDIM Steps): {ddimSteps}
                </Label>
                <Slider
                  value={[ddimSteps]}
                  onValueChange={(v) => setDdimSteps(v[0])}
                  min={10}
                  max={200}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Больше шагов = выше качество, но медленнее обработка
                </p>
              </div>

              {/* Guidance Scale */}
              <div className="space-y-2">
                <Label>
                  Guidance Scale: {guidanceScale.toFixed(1)}
                </Label>
                <Slider
                  value={[guidanceScale * 10]}
                  onValueChange={(v) => setGuidanceScale(v[0] / 10)}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Контролирует точность улучшения
                </p>
              </div>
            </>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Обработка...</span>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                {isStarting 
                  ? 'Инициализация...' 
                  : status?.status === 'processing'
                  ? 'AI улучшает качество аудио. Это может занять 1-3 минуты.'
                  : 'Ожидание...'}
              </p>
            </div>
          )}

          {/* Success State */}
          {upscaledUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Качество улучшено!</span>
              </div>
              
              <audio controls className="w-full">
                <source src={upscaledUrl} type="audio/wav" />
              </audio>

              <Button onClick={handleDownload} className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Скачать WAV (48kHz)
              </Button>
            </div>
          )}

          {/* Error State */}
          {status?.status === 'failed' && (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="text-sm">Не удалось улучшить качество</span>
            </div>
          )}
        </div>

        <DialogFooter>
          {!upscaledUrl && (
            <Button
              onClick={handleUpscale}
              disabled={isProcessing || !audioUrl}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Обработка...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Улучшить качество
                </>
              )}
            </Button>
          )}
          {upscaledUrl && (
            <Button onClick={handleClose} variant="outline" className="w-full">
              Закрыть
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
