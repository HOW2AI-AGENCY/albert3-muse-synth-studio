/**
 * Optimized Track Card Component
 * 
 * Performance-optimized version of TrackCard with:
 * - Progressive image loading
 * - Intersection observer
 * - Aggressive memoization
 * - Reduced re-renders
 * 
 * @version 1.0.0
 * @created 2025-11-17
 */

import React, { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressiveImage } from '@/components/ui/progressive-image';
import { Play, Pause, Heart, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/utils/formatters';
import type { Track } from '@/types/domain/track.types';

interface OptimizedTrackCardProps {
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
 * Optimized Track Card with progressive loading
 * 
 * Performance features:
 * - Intersection observer for images
 * - Aggressive memoization
 * - Minimal re-renders
 * - CSS containment
 */
export const OptimizedTrackCard = memo(({
  track,
  isPlaying = false,
  isLiked = false,
  onClick,
  onPlayPause,
  onLike,
  onMenu,
  className,
}: OptimizedTrackCardProps) => {
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

  // Derived values (memoized by component memo)
  const isCompleted = track.status === 'completed';
  const formattedDuration = track.duration ? formatDuration(track.duration) : null;

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden transition-all duration-300',
        'hover:shadow-glow-primary hover:-translate-y-1',
        'focus-within:ring-2 focus-within:ring-primary/50',
        className
      )}
      style={{ contain: 'layout style paint' }}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        {/* Cover Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30">
          <ProgressiveImage
            src={track.cover_url || '/placeholder.svg'}
            alt={`Обложка ${track.title}`}
            placeholderSrc="/placeholder.svg"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Play Button Overlay */}
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                variant="default"
                size="icon"
                className="h-14 w-14 rounded-full shadow-xl"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </Button>
            </div>
          )}

          {/* Status Badge */}
          {!isCompleted && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm">
              <span className="text-xs font-medium">
                {track.status === 'processing' && '⏳ Обработка'}
                {track.status === 'pending' && '⏱️ Ожидание'}
                {track.status === 'failed' && '❌ Ошибка'}
              </span>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="p-3 space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
            {track.title}
          </h3>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {formattedDuration && (
                <span>{formattedDuration}</span>
              )}
              {track.style_tags && track.style_tags.length > 0 && (
                <span>• {track.style_tags[0]}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          {isCompleted && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 gap-1',
                    isLiked && 'text-red-500'
                  )}
                  onClick={handleLike}
                >
                  <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
                  <span className="text-xs">{track.like_count || 0}</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMenu}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-render prevention
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.track.status === nextProps.track.status &&
    prevProps.track.cover_url === nextProps.track.cover_url &&
    prevProps.track.like_count === nextProps.track.like_count &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isLiked === nextProps.isLiked
  );
});

OptimizedTrackCard.displayName = 'OptimizedTrackCard';
