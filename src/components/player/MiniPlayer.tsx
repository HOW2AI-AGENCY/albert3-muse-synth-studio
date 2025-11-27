/**
 * @file MiniPlayer.tsx
 * @description A sleek, compact, and performant mini audio player for mobile devices.
 *
 * ✅ PERFORMANCE FIX #4 (v2.1.0):
 * - Объединены 3 подписки на store в одну
 * - Добавлен shallow comparison для оптимизации
 * - Уменьшен overhead от множественных подписок
 * - Компонент все еще ре-рендерится при currentTime (60 FPS), но с меньшими затратами
 *
 * @version 2.1.0
 */
import { memo, useCallback } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { shallow } from 'zustand/shallow';

interface MiniPlayerProps {
  onExpand: () => void;
}

const MiniPlayerComponent = ({ onExpand }: MiniPlayerProps) => {
  /**
   * ✅ PERFORMANCE FIX #4: Единая подписка на store
   *
   * ПРОБЛЕМА (до исправления):
   * const currentTrack = useCurrentTrack();              // Подписка 1
   * const isPlaying = useIsPlaying();                    // Подписка 2
   * const { ... } = useAudioPlayerStore(state => ...);   // Подписка 3
   * ❌ 3 отдельных подписки на один store
   * ❌ Лишний overhead при обновлении state
   *
   * РЕШЕНИЕ:
   * - Объединяем все в одну подписку с селектором
   * - Используем shallow comparison для избежания лишних ре-рендеров
   * - Одна подписка = меньше overhead
   *
   * PERFORMANCE GAIN:
   * - 66% reduction в количестве подписок (3 → 1)
   * - Меньше работы для Zustand при обновлении state
   * - Оптимизация памяти (меньше listener'ов)
   *
   * NOTE:
   * - Компонент все еще ре-рендерится при обновлении currentTime (60 FPS)
   * - Это ожидаемое поведение для progress bar
   * - Главное - уменьшен overhead от множественных подписок
   */
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    clearCurrentTrack,
    currentTime,
    duration,
  } = useAudioPlayerStore(
    (state) => ({
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      togglePlayPause: state.togglePlayPause,
      clearCurrentTrack: state.clearCurrentTrack,
      currentTime: state.currentTime,
      duration: state.duration,
    }),
    shallow  // ✅ Shallow comparison для оптимизации
  );

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

  const miniPlayerRef = useSwipeGesture({
    onSwipeUp: onExpand,
    onSwipeDown: clearCurrentTrack,
  });

  if (!currentTrack) return null;

  const progress = (currentTime / (duration || 1)) * 100;

  return (
    <div
      data-testid="mini-player"
      ref={miniPlayerRef as any}
      className="fixed left-2 right-2 rounded-lg bg-background/80 backdrop-blur-xl border border-border/20 shadow-2xl shadow-primary/10 transition-transform duration-300 ease-in-out animate-slide-in-bottom"
      style={{
        bottom: `calc(var(--bottom-tab-bar-height, 0px) + 0.5rem + env(safe-area-inset-bottom, 0px))`,
        zIndex: 'var(--z-mini-player)',  // ✅ FIX: Now properly defined in z-index.css as 110 (above bottom nav)
        willChange: 'transform',
      }}
      onClick={onExpand}
      role="button"
      aria-label="Expand player"
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-border/20">
        <div
          className="h-full bg-primary"
          style={{
            width: `${progress}%`,
            willChange: 'width',
          }}
        />
      </div>

      {/* Content */}
      <div className="flex items-center gap-3 p-2.5">
        <div className="relative flex-shrink-0 w-10 h-10">
          <img
            src={currentTrack.cover_url || '/placeholder.svg'}
            alt={currentTrack.title}
            className="w-full h-full rounded-md object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{currentTrack.title}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {currentTrack.style_tags?.[0] || 'AI Generated Music'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePlayPause}
            className="h-10 w-10 rounded-full"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive"
            aria-label="Close player"
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
