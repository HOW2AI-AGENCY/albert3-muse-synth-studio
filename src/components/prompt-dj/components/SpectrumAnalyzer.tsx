import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SpectrumAnalyzerProps {
  getAnalyserData: () => { frequencyData: Uint8Array, waveformData: Uint8Array } | null;
  isPlaying: boolean;
  className?: string;
}

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({ getAnalyserData, isPlaying, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const draw = () => {
      if (!isPlaying) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const data = getAnalyserData();
      if (!data) return;

      const { frequencyData } = data;
      const bufferLength = frequencyData.length;

      context.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

      for (let i = 0; i < bufferLength; i++) {
        barHeight = frequencyData[i];

        context.fillStyle = `hsl(${barHeight + 100}, 100%, 50%)`;
        context.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

        x += barWidth + 1;
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    if (isPlaying) {
      draw();
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, getAnalyserData]);

  return (
    <canvas ref={canvasRef} width="600" height="100" className={cn("w-full h-24 rounded-lg", className)} />
  );
};
