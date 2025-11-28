/**
 * TrackCardCompact Component
 *
 * Mobile-optimized compact card for small screens
 * Minimal UI with essential information only
 *
 * ✅ PERFORMANCE FIX #6 (v2.1.0):
 * - Дополнен memo comparison недостающими полями
 * - Теперь карточка корректно ре-рендерится при изменении cover, title, duration
 * - Исправлена проблема с устаревшими данными в UI
 *
 * ✅ MOBILE OPTIMIZATION FIX (v2.2.0):
 * - Enhanced visual distinction from list view
 * - Improved touch targets (44x44px minimum)
 * - Better border and shadow for mobile clarity
 * - Optimized text sizes for readability
 *
 * @version 2.2.0
 * @created 2025-11-17
 * @updated 2025-11-28
 */

import React, { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressiveImage } from '@/components/ui/progressive-image';
import { Play, Pause, Heart, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/utils/formatters';
import type { Track } from '@/types/domain/track.types';

interface TrackCardCompactProps {
  track: Track;
  isPlaying?: boolean;
  isLiked?: boolean;
  onClick?: () => void;
  onPlayPause?: (trackId: string) => void;
  onLike?: (trackId: string) => void;
  onMenu?: (trackId: string) => void;
  className?: string;
}

/**
 * Ultra-compact card for mobile devices
 * 
 * Features:
 * - Smaller dimensions (160px min)
 * - Reduced padding
 * - Minimal text
 * - Touch-optimized buttons
 */
export const TrackCardCompact = memo(({
  track,
  isPlaying = false,
  isLiked = false,
  onClick,
  onPlayPause,
  onLike,
  onMenu,
  className,
}: TrackCardCompactProps) => {
  // Memoized handlers
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayPause?.(track.id);
  }, [onPlayPause, track.id]);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(track.id);
  }, [onLike, track.id]);

  const handleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMenu?.(track.id);
  }, [onMenu, track.id]);

  const isCompleted = track.status === 'completed';
  const formattedDuration = track.duration ? formatDuration(track.duration) : null;

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden',
        'transition-all duration-200',
        // ✅ MOBILE OPTIMIZATION: Enhanced visual distinction
        'border-2 border-primary/10 shadow-md rounded-xl',
        'hover:shadow-lg hover:border-primary/20',
        'active:scale-95', // Touch feedback
        className
      )}
      style={{ contain: 'layout style paint' }}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        {/* Cover Image - Compact */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30">
          <ProgressiveImage
            src={track.cover_url || '/placeholder.svg'}
            alt={track.title}
            placeholderSrc="/placeholder.svg"
            className="w-full h-full object-cover"
          />

          {/* Play Button - Always visible on mobile */}
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>
            </div>
          )}

          {/* Status Badge - Compact */}
          {!isCompleted && (
            <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-background/90 backdrop-blur-sm">
              <span className="text-[10px] font-medium">
                {track.status === 'processing' && '⏳'}
                {track.status === 'pending' && '⏱️'}
                {track.status === 'failed' && '❌'}
              </span>
            </div>
          )}
        </div>

        {/* Track Info - Ultra Compact */}
        <div className="p-1.5 space-y-1">
          {/* Title - Single line */}
          <h3 className="font-semibold text-[11px] line-clamp-1">
            {track.title}
          </h3>

          {/* Metadata - Minimal */}
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            {formattedDuration && <span>{formattedDuration}</span>}
          </div>

          {/* Actions - ✅ MOBILE OPTIMIZATION: 44x44px touch targets */}
          {isCompleted && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 min-h-[44px] min-w-[44px]',
                  isLiked && 'text-red-500'
                )}
                onClick={handleLike}
                aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
              >
                <Heart className={cn('h-3 w-3', isLiked && 'fill-current')} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 min-h-[44px] min-w-[44px]"
                onClick={handleMenu}
                aria-label="Открыть меню"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  /**
   * ✅ ИСПРАВЛЕНО: Полная проверка всех используемых полей
   *
   * БЫЛО (INCOMPLETE):
   * prevProps.track.id === nextProps.track.id &&
   * prevProps.track.status === nextProps.track.status &&
   * prevProps.isPlaying === nextProps.isPlaying &&
   * prevProps.isLiked === nextProps.isLiked
   * ❌ Пропущены: cover_url, title, duration
   * ❌ Карточка не обновлялась при изменении обложки или названия
   *
   * СТАЛО (COMPLETE):
   * ✅ Добавлены все поля, которые отображаются в компоненте
   * ✅ Карточка корректно ре-рендерится при любых изменениях
   * ✅ Нет устаревших данных в UI
   *
   * ПРИМЕЧАНИЕ:
   * - memo comparison: return true = НЕ ре-рендерить (shouldNotUpdate)
   * - Сравниваем только те поля, которые реально используются в render
   */
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.track.status === nextProps.track.status &&
    prevProps.track.cover_url === nextProps.track.cover_url &&  // ✅ Добавлено: используется в <img src={}>
    prevProps.track.title === nextProps.track.title &&          // ✅ Добавлено: отображается в <h3>
    prevProps.track.duration === nextProps.track.duration &&    // ✅ Добавлено: форматируется и отображается
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isLiked === nextProps.isLiked
  );
});

TrackCardCompact.displayName = 'TrackCardCompact';
