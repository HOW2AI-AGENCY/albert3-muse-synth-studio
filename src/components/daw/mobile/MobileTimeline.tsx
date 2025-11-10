/**
 * Mobile Timeline Component
 *
 * Compact timeline for mobile with:
 * - Horizontal scrolling
 * - Pinch to zoom
 * - Tap to seek
 * - Playhead indicator
 *
 * @module components/daw/mobile/MobileTimeline
 */

import React, { useRef, useEffect, useState } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { useTouchGestures } from '@/hooks/useTouchGestures';

export const MobileTimeline: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(320);

  const timeline = useDAWStore((state) => state.timeline);
  const project = useDAWStore((state) => state.project);
  const seekTo = useDAWStore((state) => state.seekTo);
  const setZoom = useDAWStore((state) => state.setZoom);
  const setScroll = useDAWStore((state) => state.setScroll);

  const { currentTime, zoom, scrollLeft } = timeline;
  const bpm = project?.bpm || 120;

  // Touch gestures
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useTouchGestures({
    onTap: (x) => {
      // Seek to tap position
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const relativeX = x - rect.left;
      const time = (relativeX + scrollLeft) / zoom;
      seekTo(Math.max(0, time));
    },
    onPinchMove: (scale) => {
      // Pinch to zoom
      const newZoom = Math.max(10, Math.min(200, zoom * scale));
      setZoom(newZoom);
    },
    onTwoFingerScroll: (deltaX) => {
      // Scroll timeline
      setScroll(Math.max(0, scrollLeft - deltaX));
    },
  });

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Draw timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const height = 60;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = containerWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, containerWidth, height);

    // Calculate visible time range
    const startTime = scrollLeft / zoom;
    const endTime = (scrollLeft + containerWidth) / zoom;

    // Draw time markers
    const beatDuration = 60 / bpm;
    const measureDuration = beatDuration * 4;

    let interval: number;
    if (zoom > 100) {
      interval = beatDuration;
    } else if (zoom > 40) {
      interval = measureDuration;
    } else {
      interval = measureDuration * 4;
    }

    const startTick = Math.floor(startTime / interval) * interval;

    ctx.strokeStyle = '#4b5563';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    for (let time = startTick; time <= endTime; time += interval) {
      const x = (time * zoom) - scrollLeft;
      if (x < 0 || x > containerWidth) continue;

      const isMeasure = Math.abs(time % measureDuration) < 0.001;

      // Draw tick
      ctx.lineWidth = isMeasure ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, height - (isMeasure ? 15 : 10));
      ctx.lineTo(x, height);
      ctx.stroke();

      // Draw label
      if (isMeasure) {
        const measure = Math.floor(time / measureDuration) + 1;
        ctx.fillText(`${measure}`, x, 12);
      }
    }

    // Draw playhead
    const playheadX = (currentTime * zoom) - scrollLeft;
    if (playheadX >= 0 && playheadX <= containerWidth) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX - 5, 8);
      ctx.lineTo(playheadX + 5, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [containerWidth, currentTime, zoom, scrollLeft, bpm]);

  return (
    <div
      ref={containerRef}
      className="relative h-[60px] bg-surface border-b border-border overflow-hidden touch-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Zoom indicator */}
      <div className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-muted-foreground">
        {Math.round(zoom)}px/s
      </div>
    </div>
  );
};
