import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface StemWaveformProps {
  audioUrl: string;
  isActive: boolean;
  currentTime?: number;
  duration?: number;
  className?: string;
}

export const StemWaveform = ({ 
  audioUrl, 
  isActive, 
  currentTime = 0,
  duration = 0,
  className 
}: StemWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const generateWaveform = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        if (isCancelled) return;
        
        const rawData = audioBuffer.getChannelData(0);
        const samples = 100; // Number of bars in waveform
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }
        
        // Normalize
        const max = Math.max(...filteredData);
        const normalized = filteredData.map(v => v / max);
        
        if (!isCancelled) {
          setWaveformData(normalized);
          setIsLoading(false);
        }
        
        audioContext.close();
      } catch (error) {
        console.error('Failed to generate waveform:', error);
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    generateWaveform();

    return () => {
      isCancelled = true;
    };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const barWidth = width / waveformData.length;
    const progressPercent = duration > 0 ? currentTime / duration : 0;
    const progressX = width * progressPercent;

    ctx.clearRect(0, 0, width, height);

    waveformData.forEach((value, index) => {
      const barHeight = value * height * 0.8;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      
      // Determine color based on progress
      const isPast = x < progressX;
      
      if (isActive) {
        ctx.fillStyle = isPast 
          ? 'hsl(var(--primary))' 
          : 'hsl(var(--muted-foreground) / 0.3)';
      } else {
        ctx.fillStyle = 'hsl(var(--muted-foreground) / 0.15)';
      }
      
      ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight);
    });
  }, [waveformData, currentTime, duration, isActive]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/30 rounded', className)}>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-0.5 h-3 bg-muted-foreground/30 animate-pulse rounded-full"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full rounded', className)}
      style={{ height: '32px' }}
    />
  );
};
