/**
 * Enhanced Timeline Component for DAW
 *
 * Features:
 * - Time ruler with beats and measures
 * - Playhead with snapping
 * - Loop region markers
 * - Markers and regions
 * - Zoom and scroll
 *
 * @module components/daw/TimelineEnhanced
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { cn } from '@/lib/utils';

interface TimelineEnhancedProps {
  width: number;
  height?: number;
  className?: string;
  onSeek?: (time: number) => void;
}

export const TimelineEnhanced: React.FC<TimelineEnhancedProps> = ({
  width,
  height = 48,
  className = '',
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const timeline = useDAWStore((state) => state.timeline);
  const project = useDAWStore((state) => state.project);
  const markers = useDAWStore((state) => state.project?.markers || []);
  const seekTo = useDAWStore((state) => state.seekTo);
  const snapTimeToGrid = useDAWStore((state) => state.snapTimeToGrid);

  const { currentTime, zoom, scrollLeft, loopStart, loopEnd, snapToGrid } = timeline;
  const bpm = project?.bpm || 120;

  // Convert time to pixel position
  const timeToPixel = useCallback(
    (time: number) => {
      return time * zoom - scrollLeft;
    },
    [zoom, scrollLeft]
  );

  // Convert pixel position to time
  const pixelToTime = useCallback(
    (pixel: number) => {
      const time = (pixel + scrollLeft) / zoom;
      return snapToGrid ? snapTimeToGrid(time) : time;
    },
    [zoom, scrollLeft, snapToGrid, snapTimeToGrid]
  );

  // Draw timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Calculate visible time range
    const startTime = scrollLeft / zoom;
    const endTime = (scrollLeft + width) / zoom;

    // Draw time ruler
    drawTimeRuler(ctx, width, height, startTime, endTime, zoom, bpm);

    // Draw loop region
    if (loopStart !== null && loopEnd !== null) {
      const loopStartX = timeToPixel(loopStart);
      const loopEndX = timeToPixel(loopEnd);

      if (loopStartX < width && loopEndX > 0) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.fillRect(
          Math.max(0, loopStartX),
          0,
          Math.min(width - Math.max(0, loopStartX), loopEndX - loopStartX),
          height
        );

        // Loop markers
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;

        if (loopStartX >= 0 && loopStartX <= width) {
          ctx.beginPath();
          ctx.moveTo(loopStartX, 0);
          ctx.lineTo(loopStartX, height);
          ctx.stroke();
        }

        if (loopEndX >= 0 && loopEndX <= width) {
          ctx.beginPath();
          ctx.moveTo(loopEndX, 0);
          ctx.lineTo(loopEndX, height);
          ctx.stroke();
        }
      }
    }

    // Draw markers
    markers.forEach((marker) => {
      const x = timeToPixel(marker.time);
      if (x >= 0 && x <= width) {
        ctx.strokeStyle = marker.color || '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Marker label
        ctx.fillStyle = marker.color || '#f59e0b';
        ctx.font = '10px sans-serif';
        ctx.fillText(marker.label, x + 4, 12);
      }
    });

    // Draw playhead
    const playheadX = timeToPixel(currentTime);
    if (playheadX >= 0 && playheadX <= width) {
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
      ctx.lineTo(playheadX - 6, 8);
      ctx.lineTo(playheadX + 6, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [
    width,
    height,
    currentTime,
    zoom,
    scrollLeft,
    loopStart,
    loopEnd,
    markers,
    bpm,
    timeToPixel,
  ]);

  // Handle click to seek
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const time = pixelToTime(x);

      seekTo(time);
      onSeek?.(time);
    },
    [pixelToTime, seekTo, onSeek]
  );

  // Handle drag to seek
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      handleClick(e);
    },
    [handleClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;
      handleClick(e);
    },
    [isDragging, handleClick]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative bg-surface', className)}>
      <canvas
        ref={canvasRef}
        className="cursor-pointer"
        style={{ width, height, display: 'block' }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

/**
 * Draw time ruler with beats and measures
 */
function drawTimeRuler(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  startTime: number,
  endTime: number,
  zoom: number,
  bpm: number
) {
  const beatDuration = 60 / bpm; // Duration of one beat in seconds
  const measureDuration = beatDuration * 4; // Assuming 4/4 time signature

  // Determine tick interval based on zoom
  let tickInterval: number;
  let showBeats = true;

  if (zoom > 200) {
    // Very zoomed in - show beat subdivisions (16th notes)
    tickInterval = beatDuration / 4;
  } else if (zoom > 100) {
    // Zoomed in - show beats
    tickInterval = beatDuration;
  } else if (zoom > 40) {
    // Medium zoom - show measures
    tickInterval = measureDuration;
    showBeats = true;
  } else {
    // Zoomed out - show measures only
    tickInterval = measureDuration;
    showBeats = false;
  }

  // Draw ticks
  const startTick = Math.floor(startTime / tickInterval) * tickInterval;
  const endTick = Math.ceil(endTime / tickInterval) * tickInterval;

  ctx.strokeStyle = '#4b5563';
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';

  for (let time = startTick; time <= endTick; time += tickInterval) {
    const x = (time * zoom) - (startTime * zoom);
    if (x < 0 || x > width) continue;

    const isMeasure = Math.abs(time % measureDuration) < 0.001;
    const isBeat = Math.abs(time % beatDuration) < 0.001;

    let tickHeight: number;
    let showLabel = false;

    if (isMeasure) {
      tickHeight = height * 0.6;
      showLabel = true;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#9ca3af';
    } else if (isBeat && showBeats) {
      tickHeight = height * 0.4;
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#6b7280';
    } else {
      tickHeight = height * 0.25;
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#4b5563';
    }

    // Draw tick
    ctx.beginPath();
    ctx.moveTo(x, height - tickHeight);
    ctx.lineTo(x, height);
    ctx.stroke();

    // Draw label for measures
    if (showLabel) {
      const measure = Math.floor(time / measureDuration) + 1;
      const beat = Math.floor((time % measureDuration) / beatDuration) + 1;
      const label = zoom > 60 ? `${measure}.${beat}` : `${measure}`;

      ctx.fillText(label, x, 12);
    }
  }

  // Draw time labels at top
  if (zoom < 40) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#d1d5db';
    ctx.font = '11px monospace';

    const labelInterval = Math.ceil(30 / zoom); // Label every ~30 seconds
    for (let time = Math.floor(startTime); time <= endTime; time += labelInterval) {
      const x = (time * zoom) - (startTime * zoom);
      if (x < 0 || x > width - 60) continue;

      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const label = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      ctx.fillText(label, x + 2, 12);
    }
  }
}
