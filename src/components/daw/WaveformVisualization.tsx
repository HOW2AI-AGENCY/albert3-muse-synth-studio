/**
 * Waveform Visualization Component
 *
 * Renders audio waveform using Web Audio API and Canvas
 * Features:
 * - High-performance canvas rendering
 * - Peak detection for smooth visualization
 * - Zoom and scroll support
 * - Progressive loading for large files
 *
 * @module components/daw/WaveformVisualization
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { logError, logInfo } from '@/utils/logger';
import { Skeleton } from '@/components/ui/skeleton';

interface WaveformVisualizationProps {
  audioUrl: string;
  width: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  zoom?: number; // Pixels per second
  startTime?: number; // Visible start time
  duration?: number; // Audio duration in seconds
  className?: string;
  onReady?: (duration: number) => void;
}

interface WaveformData {
  peaks: Float32Array;
  duration: number;
  sampleRate: number;
}

export const WaveformVisualization: React.FC<WaveformVisualizationProps> = ({
  audioUrl,
  width,
  height = 80,
  color = '#3b82f6',
  backgroundColor = '#1f2937',
  zoom = 60,
  startTime = 0,
  duration,
  className = '',
  onReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  // Load and decode audio
  const loadAudio = useCallback(async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);

      logInfo('Loading audio for waveform', 'WaveformVisualization', { url });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      if (!audioContextRef.current) {
        throw new Error('AudioContext not initialized');
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      // Extract peaks for visualization
      const peaks = extractPeaks(audioBuffer, width, zoom, startTime);

      const data: WaveformData = {
        peaks,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
      };

      setWaveformData(data);
      setIsLoading(false);

      logInfo('Waveform data loaded', 'WaveformVisualization', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        peaksLength: peaks.length,
      });

      onReady?.(audioBuffer.duration);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsLoading(false);
      logError('Failed to load waveform', err as Error, 'WaveformVisualization', { url });
    }
  }, [width, zoom, startTime, onReady]);

  // Load audio when URL changes
  useEffect(() => {
    if (audioUrl) {
      loadAudio(audioUrl);
    }
  }, [audioUrl, loadAudio]);

  // Draw waveform
  useEffect(() => {
    if (!waveformData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Calculate visible peaks based on zoom and scroll
    const visibleDuration = width / zoom;
    const endTime = Math.min(startTime + visibleDuration, waveformData.duration);

    const startIndex = Math.floor((startTime / waveformData.duration) * waveformData.peaks.length);
    const endIndex = Math.ceil((endTime / waveformData.duration) * waveformData.peaks.length);

    const visiblePeaks = waveformData.peaks.slice(startIndex, endIndex);

    // Draw waveform
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const midY = height / 2;
    const amplitudeScale = height / 2.5; // Leave some margin

    if (visiblePeaks.length > 0) {
      const step = width / visiblePeaks.length;

      for (let i = 0; i < visiblePeaks.length; i++) {
        const x = i * step;
        const amplitude = visiblePeaks[i] * amplitudeScale;

        // Draw vertical line from center
        ctx.beginPath();
        ctx.moveTo(x, midY - amplitude);
        ctx.lineTo(x, midY + amplitude);
        ctx.stroke();
      }
    }

    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

  }, [waveformData, width, height, color, backgroundColor, zoom, startTime]);

  if (isLoading) {
    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-destructive ${className}`}
        style={{ width, height, backgroundColor }}
      >
        Failed to load waveform
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, display: 'block' }}
    />
  );
};

/**
 * Extract peaks from audio buffer for visualization
 * Uses downsampling to improve performance
 */
function extractPeaks(
  audioBuffer: AudioBuffer,
  canvasWidth: number,
  zoom: number,
  startTime: number
): Float32Array {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  const duration = audioBuffer.duration;

  // Calculate how many samples we need based on zoom level
  const visibleDuration = canvasWidth / zoom;
  const samplesPerPixel = Math.floor((sampleRate * visibleDuration) / canvasWidth);

  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.min(
    startSample + Math.floor(visibleDuration * sampleRate),
    channelData.length
  );

  const visibleSamples = endSample - startSample;
  const numPeaks = Math.min(canvasWidth, Math.ceil(visibleSamples / samplesPerPixel));

  const peaks = new Float32Array(numPeaks);

  // Extract peaks (max amplitude per pixel)
  for (let i = 0; i < numPeaks; i++) {
    const start = startSample + i * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, endSample);

    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) {
        max = abs;
      }
    }
    peaks[i] = max;
  }

  return peaks;
}
