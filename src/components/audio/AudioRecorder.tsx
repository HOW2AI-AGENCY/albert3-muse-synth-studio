import { useEffect, useRef, useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Trash2, Square } from '@/utils/iconImports';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onRecordComplete?: (url: string) => void;
  onRemove?: () => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const AudioRecorder = memo(({ onRecordComplete, onRemove, className }: AudioRecorderProps) => {
  const {
    isRecording,
    audioBlob,
    audioUrl,
    recordingTime,
    analyser,
    maxTime,
    startRecording,
    stopRecording,
    reset,
  } = useAudioRecorder({ onRecordComplete });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(400);

  // Dynamic canvas width
  useEffect(() => {
    const updateCanvasWidth = () => {
      if (containerRef.current) {
        setCanvasWidth(containerRef.current.clientWidth);
      }
    };

    updateCanvasWidth();
    window.addEventListener('resize', updateCanvasWidth);
    return () => window.removeEventListener('resize', updateCanvasWidth);
  }, []);

  // Waveform visualization
  useEffect(() => {
    if (!isRecording || !analyser || !canvasRef.current) return;

    const renderWaveform = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas || !analyser) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'hsl(var(--card))';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    const draw = () => {
      if (!isRecording || !analyser || !canvasRef.current) return;

      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          animationRef.current = requestAnimationFrame(draw);
          renderWaveform();
        }, { timeout: 50 });
      } else {
        animationRef.current = requestAnimationFrame(draw);
        renderWaveform();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, analyser]);

  const handleRemove = () => {
    reset();
    onRemove?.();
  };

  return (
    <Card className={cn('border-2', className)} ref={containerRef}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5" />
          Запись с микрофона
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Waveform Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={60}
          className={cn(
            'w-full h-15 rounded bg-muted/50',
            !isRecording && 'opacity-50'
          )}
          aria-label="Визуализация записи аудио"
          role="img"
        />

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!audioUrl || isRecording ? (
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? 'destructive' : 'default'}
              className="flex-1 text-xs h-8"
              aria-label={isRecording ? "Остановить запись" : "Начать запись"}
              aria-live="polite"
              aria-atomic="true"
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  <span>Остановить</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  <span>Записать</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleRemove}
              variant="outline"
              className="flex-1 text-xs h-8"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Удалить и записать заново
            </Button>
          )}
        </div>

        {/* Timer/Info */}
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            'font-mono',
            isRecording && recordingTime > maxTime * 0.8 && 'text-destructive'
          )}>
            {formatTime(recordingTime)} / {formatTime(maxTime)}
          </span>
          {audioBlob && (
            <span className="text-muted-foreground">
              {(audioBlob.size / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
        </div>

        {/* Audio Preview */}
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full" />
        )}
      </CardContent>
    </Card>
  );
});

AudioRecorder.displayName = 'AudioRecorder';
