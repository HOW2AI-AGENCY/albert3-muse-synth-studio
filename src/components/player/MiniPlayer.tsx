/**
 * @file MiniPlayer.tsx
 * @description Sleek, compact mobile mini player - mobile-first design
 * 
 * ✅ COMPLETE REWRITE v3.0.0:
 * - Mobile-first approach with optimized touch targets
 * - Fixed store subscription issues
 * - Isolated progress bar to prevent re-renders
 * - Gesture support for expand/dismiss
 * - Performance optimized with memo + shallow
 * 
 * @version 3.0.0
 * @created 2025-11-29
 */

import { memo, useCallback } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

interface MiniPlayerProps {
  onExpand: () => void;
}

/**
 * ✅ Isolated progress bar - prevents main player re-renders
 * Only this component re-renders at 60 FPS
 */
const MiniPlayerProgressBar = memo(() => {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const duration = useAudioPlayerStore((state) => state.duration);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="absolute top-0 left-0 right-0 h-1 bg-border/20 rounded-t-lg overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-150 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, progress))}%`,
          willChange: 'width',
        }}
        aria-label={`Прогресс воспроизведения: ${Math.round(progress)}%`}
      />
    </div>
  );
});

MiniPlayerProgressBar.displayName = 'MiniPlayerProgressBar';

/**
 * Main MiniPlayer Component
 * Renders above bottom navigation with smooth animations
 */
const MiniPlayerComponent = ({ onExpand }: MiniPlayerProps) => {
  // ✅ FIX: Correct store subscription with proper types
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const isPlaying = useAudioPlayerStore((state) => state.isPlaying);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const clearCurrentTrack = useAudioPlayerStore((state) => state.clearCurrentTrack);

  const { vibrate } = useHapticFeedback();

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('light');
    togglePlayPause();
  }, [togglePlayPause, vibrate]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate('medium');
    clearCurrentTrack();
  }, [clearCurrentTrack, vibrate]);

  const handleExpand = useCallback(() => {
    vibrate('light');
    onExpand();
  }, [onExpand, vibrate]);

  const miniPlayerRef = useSwipeGesture({
    onSwipeUp: handleExpand,
    onSwipeDown: clearCurrentTrack,
  });

  if (!currentTrack) return null;

  return (
    <div
      data-testid="mini-player"
      ref={miniPlayerRef as any}
      className="fixed left-2 right-2 rounded-xl bg-background/95 backdrop-blur-xl border-2 border-border/30 shadow-2xl shadow-primary/10 transition-all duration-300 ease-out hover:shadow-primary/20 hover:border-primary/40 animate-slide-in-bottom"
      style={{
        bottom: `calc(var(--bottom-tab-bar-height, 0px) + 0.5rem + env(safe-area-inset-bottom, 0px))`,
        zIndex: 110, // Above bottom nav (z-index: 100)
        willChange: 'transform',
      }}
      onClick={handleExpand}
      role="button"
      aria-label="Открыть плеер"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleExpand();
        }
      }}
    >
      {/* ✅ Isolated progress bar */}
      <MiniPlayerProgressBar />

      {/* Main content */}
      <div className="flex items-center gap-3 p-3">
        {/* Cover image */}
        <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden ring-2 ring-primary/20 shadow-md">
          <img
            src={currentTrack.cover_url || '/placeholder.svg'}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate leading-tight text-foreground">
            {currentTrack.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {currentTrack.style_tags?.[0] || 'AI Generated Music'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Play/Pause */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePlayPause}
            className="h-11 w-11 rounded-full hover:bg-primary/10 active:scale-95 transition-all touch-target-optimal"
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-primary" />
            ) : (
              <Play className="h-5 w-5 ml-0.5 text-primary" />
            )}
          </Button>

          {/* Close */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            className="h-11 w-11 rounded-full hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all touch-target-optimal"
            aria-label="Закрыть плеер"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const MemoizedMiniPlayer = memo(MiniPlayerComponent);
MemoizedMiniPlayer.displayName = 'MiniPlayer';

export { MemoizedMiniPlayer as MiniPlayer };
