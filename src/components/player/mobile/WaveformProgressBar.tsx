/**
 * WaveformProgressBar Component
 *
 * Mobile-optimized waveform visualization with progress tracking and seeking.
 * Implements MusicVerse UI/UX specification for full-screen player.
 *
 * Features:
 * - Real-time waveform visualization using Web Audio API
 * - Touch-based seeking with haptic feedback
 * - Dual-color progress indication (played/unplayed)
 * - Smooth animations and transitions
 * - Performance optimized with memoization and canvas rendering
 * - WCAG AAA compliant touch targets (48px minimum)
 *
 * @module components/player/mobile/WaveformProgressBar
 * @since v2.6.3
 */

import { memo, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { logError, logInfo } from '@/utils/logger';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { Skeleton } from '@/components/ui/skeleton';

interface WaveformProgressBarProps {
  audioUrl: string;
  onSeek: (time: number) => void;
  className?: string;
  /** Number of waveform bars (default: 100) */
  barCount?: number;
  /** Height in pixels (default: 64) */
  height?: number;
  /** Enable haptic feedback on touch (default: true) */
  enableHaptics?: boolean;
}

interface WaveformData {
  peaks: Float32Array;
  duration: number;
}

/**
 * WaveformProgressBar - Interactive waveform with progress tracking
 *
 * @example
 * ```tsx
 * <WaveformProgressBar
 *   audioUrl={track.audio_url}
 *   onSeek={(time) => audioRef.current.currentTime = time}
 *   className="my-4"
 * />
 * ```
 */
export const WaveformProgressBar = memo<WaveformProgressBarProps>(({
  audioUrl,
  onSeek,
  className,
  barCount = 100,
  height = 64,
  enableHaptics = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);

  // Subscribe to audio player state (optimized - doesn't trigger parent re-renders)
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const duration = useAudioPlayerStore((state) => state.duration);

  /**
   * Initialize AudioContext on mount
   */
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

  /**
   * Load and decode audio to extract waveform data
   */
  const loadWaveform = useCallback(async (url: string) => {
    try {
      setIsLoading(true);

      logInfo('Loading waveform data', 'WaveformProgressBar', { url, barCount });

      // Fetch audio file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Decode audio data
      if (!audioContextRef.current) {
        throw new Error('AudioContext not initialized');
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      // Extract peaks for visualization
      const peaks = extractPeaks(audioBuffer, barCount);

      setWaveformData({
        peaks,
        duration: audioBuffer.duration,
      });

      setIsLoading(false);

      logInfo('Waveform loaded successfully', 'WaveformProgressBar', {
        duration: audioBuffer.duration,
        peaks: peaks.length,
      });
    } catch (error) {
      logError('Failed to load waveform', error as Error, 'WaveformProgressBar', { url });
      setIsLoading(false);
    }
  }, [barCount]);

  /**
   * Load waveform when audio URL changes
   */
  useEffect(() => {
    if (audioUrl) {
      loadWaveform(audioUrl);
    }
  }, [audioUrl, loadWaveform]);

  /**
   * Calculate progress percentage
   */
  const progressPercent = useMemo(() => {
    const effectiveDuration = waveformData?.duration || duration || 0;
    if (effectiveDuration === 0) return 0;
    return Math.min(Math.max(currentTime / effectiveDuration, 0), 1);
  }, [currentTime, duration, waveformData?.duration]);

  /**
   * Draw waveform on canvas
   */
  useEffect(() => {
    if (!waveformData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size (accounting for device pixel ratio)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const canvasHeight = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    // Calculate bar dimensions
    const barWidth = width / waveformData.peaks.length;
    const progressX = width * progressPercent;

    // Draw waveform bars
    waveformData.peaks.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = peak * canvasHeight * 0.85; // 85% of canvas height for visual balance
      const y = (canvasHeight - barHeight) / 2;

      // Determine color based on progress
      const isPast = x < progressX;

      // High contrast colors for better visibility
      ctx.fillStyle = isPast
        ? 'hsl(var(--primary))' // Primary accent for played
        : 'hsl(var(--muted-foreground) / 0.35)'; // Slightly more visible muted

      // Draw bar with rounded corners
      const actualBarWidth = Math.max(barWidth - 2, 1); // 2px gap between bars
      ctx.beginPath();
      ctx.roundRect(x, y, actualBarWidth, barHeight, 2);
      ctx.fill();
    });

    // Draw progress indicator line (subtle vertical line at current position)
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, canvasHeight);
    ctx.stroke();

  }, [waveformData, progressPercent]);

  /**
   * Handle touch/click for seeking
   */
  const handleSeek = useCallback((clientX: number) => {
    if (!containerRef.current || !waveformData) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1);
    const seekTime = percent * waveformData.duration;

    // Haptic feedback on seek (if supported and enabled)
    if (enableHaptics && 'vibrate' in navigator) {
      navigator.vibrate(10); // 10ms haptic pulse
    }

    onSeek(seekTime);
  }, [waveformData, onSeek, enableHaptics]);

  /**
   * Mouse/touch event handlers
   */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsSeeking(true);
    handleSeek(e.clientX);
  }, [handleSeek]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isSeeking) {
      handleSeek(e.clientX);
    }
  }, [isSeeking, handleSeek]);

  const handlePointerUp = useCallback(() => {
    setIsSeeking(false);
  }, []);

  /**
   * Format time for accessibility
   */
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const formattedCurrentTime = formatTime(currentTime);
  const formattedDuration = formatTime(waveformData?.duration || duration);

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="w-full rounded-lg" style={{ height: `${height}px` }} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>
      </div>
    );
  }

  /**
   * Error state (fallback to simple progress bar)
   */
  if (!waveformData) {
    return (
      <div className={cn('space-y-2', className)}>
        <div
          className="w-full bg-muted/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground"
          style={{ height: `${height}px` }}
        >
          Waveform unavailable
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 select-none', className)}>
      {/* Waveform canvas with touch interaction */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full rounded-lg overflow-hidden cursor-pointer',
          'touch-none', // Prevent default touch behaviors
          isSeeking && 'cursor-grabbing'
        )}
        style={{ height: `${height}px`, minHeight: '48px' }} // WCAG AAA touch target
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="slider"
        aria-label={`Waveform progress: ${formattedCurrentTime} of ${formattedDuration}`}
        aria-valuemin={0}
        aria-valuemax={waveformData.duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onKeyDown={(e) => {
          // Keyboard accessibility: arrow keys to seek
          if (e.key === 'ArrowLeft') {
            onSeek(Math.max(currentTime - 5, 0));
          } else if (e.key === 'ArrowRight') {
            onSeek(Math.min(currentTime + 5, waveformData.duration));
          }
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-muted-foreground/80 font-medium tabular-nums px-1">
        <span>{formattedCurrentTime}</span>
        <span>{formattedDuration}</span>
      </div>
    </div>
  );
});

WaveformProgressBar.displayName = 'WaveformProgressBar';

/**
 * Extract peak amplitude values from audio buffer
 * Uses average RMS for smoother visualization
 *
 * @param audioBuffer - Decoded audio buffer
 * @param numBars - Number of bars to generate
 * @returns Float32Array of normalized peak values (0-1)
 */
function extractPeaks(audioBuffer: AudioBuffer, numBars: number): Float32Array {
  const channelData = audioBuffer.getChannelData(0); // Use first channel (mono or left)
  const samplesPerBar = Math.floor(channelData.length / numBars);
  const peaks = new Float32Array(numBars);

  // Extract RMS (Root Mean Square) for each bar
  for (let i = 0; i < numBars; i++) {
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, channelData.length);

    let sum = 0;
    let count = 0;

    for (let j = start; j < end; j++) {
      const sample = channelData[j];
      sum += sample * sample; // Square of amplitude
      count++;
    }

    // RMS = sqrt(average of squares)
    const rms = Math.sqrt(sum / count);
    peaks[i] = rms;
  }

  // Normalize peaks to 0-1 range
  const maxPeak = Math.max(...Array.from(peaks));
  if (maxPeak > 0) {
    for (let i = 0; i < peaks.length; i++) {
      peaks[i] = peaks[i] / maxPeak;
    }
  }

  return peaks;
}
