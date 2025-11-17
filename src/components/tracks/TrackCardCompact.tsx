/**
 * TrackCardCompact Component
 * 
 * Mobile-optimized compact card for small screens
 * Minimal UI with essential information only
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
        'active:scale-95', // Touch feedback
        'shadow-sm',
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

          {/* Actions - Compact */}
          {isCompleted && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-6 w-6',
                  isLiked && 'text-red-500'
                )}
                onClick={handleLike}
              >
                <Heart className={cn('h-3 w-3', isLiked && 'fill-current')} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleMenu}
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
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.track.status === nextProps.track.status &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isLiked === nextProps.isLiked
  );
});

TrackCardCompact.displayName = 'TrackCardCompact';
