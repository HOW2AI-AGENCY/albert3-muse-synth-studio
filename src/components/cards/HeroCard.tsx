/**
 * HeroCard Component
 *
 * Premium card component for featuring tracks, albums, and playlists.
 * Implements MusicVerse UI/UX specification with glassmorphism and gradients.
 *
 * Features:
 * - Glassmorphic background with backdrop blur
 * - Gradient overlays for visual hierarchy
 * - Large cover art with overlay effects
 * - Prominent play button (64px - WCAG AAA)
 * - Metrics display (plays, likes, duration)
 * - Support for tracks, albums, and playlists
 * - Mobile-optimized touch interactions
 * - Skeleton loading state
 *
 * @module components/cards/HeroCard
 * @since v2.6.3
 */

import { memo, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Heart, MoreHorizontal, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export type HeroCardType = 'track' | 'album' | 'playlist';

export interface HeroCardData {
  id: string;
  title: string;
  subtitle?: string; // Artist, album name, or playlist creator
  coverUrl: string | null;
  type: HeroCardType;

  // Metrics
  playCount?: number;
  likeCount?: number;
  duration?: number | null; // In seconds (for tracks)
  trackCount?: number; // For albums/playlists

  // Metadata
  tags?: string[];
  createdAt?: string;
  isPublic?: boolean;

  // State
  isLiked?: boolean;
}

interface HeroCardProps {
  data: HeroCardData;
  isPlaying?: boolean;
  size?: 'default' | 'large';
  variant?: 'default' | 'featured';
  onPlay?: (data: HeroCardData) => void;
  onPause?: (data: HeroCardData) => void;
  onLike?: (data: HeroCardData) => void;
  onMore?: (data: HeroCardData) => void;
  onClick?: (data: HeroCardData) => void;
  className?: string;
}

/**
 * HeroCard - Premium card for featured content
 *
 * @example
 * ```tsx
 * <HeroCard
 *   data={{
 *     id: '1',
 *     title: 'Summer Vibes',
 *     subtitle: 'AI Generated',
 *     coverUrl: 'https://example.com/cover.jpg',
 *     type: 'track',
 *     playCount: 1234,
 *     likeCount: 89,
 *     tags: ['Electronic', 'Upbeat'],
 *   }}
 *   onPlay={(data) => playTrack(data.id)}
 *   size="large"
 *   variant="featured"
 * />
 * ```
 */
export const HeroCard = memo<HeroCardProps>(({
  data,
  isPlaying = false,
  size = 'default',
  variant = 'default',
  onPlay,
  onPause,
  onLike,
  onMore,
  onClick,
  className,
}) => {
  /**
   * Format large numbers (1234 → 1.2K)
   */
  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  /**
   * Format duration (seconds → MM:SS)
   */
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Memoized formatted values
   */
  const formattedPlayCount = useMemo(
    () => data.playCount ? formatCount(data.playCount) : null,
    [data.playCount, formatCount]
  );

  const formattedLikeCount = useMemo(
    () => data.likeCount ? formatCount(data.likeCount) : null,
    [data.likeCount, formatCount]
  );

  const formattedDuration = useMemo(
    () => data.duration ? formatDuration(data.duration) : null,
    [data.duration, formatDuration]
  );

  const relativeTime = useMemo(
    () => data.createdAt ? formatDistanceToNow(new Date(data.createdAt), { addSuffix: true }) : null,
    [data.createdAt]
  );

  /**
   * Event handlers
   */
  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      onPause?.(data);
    } else {
      onPlay?.(data);
    }
  }, [isPlaying, onPause, onPlay, data]);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(data);
  }, [onLike, data]);

  const handleMore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMore?.(data);
  }, [onMore, data]);

  const handleCardClick = useCallback(() => {
    onClick?.(data);
  }, [onClick, data]);

  /**
   * Size variants
   */
  const isLarge = size === 'large';
  const isFeatured = variant === 'featured';

  const cardSizeClasses = isLarge
    ? 'min-h-[320px] md:min-h-[380px]'
    : 'min-h-[280px] md:min-h-[320px]';

  const coverSizeClasses = isLarge
    ? 'h-[180px] md:h-[220px]'
    : 'h-[140px] md:h-[180px]';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[var(--mv-radius-card)] transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-[var(--mv-hero-card-glow)]',
        onClick && 'cursor-pointer',
        cardSizeClasses,
        className
      )}
      onClick={handleCardClick}
      role="article"
      aria-label={`${data.type}: ${data.title}`}
    >
      {/* Background with glassmorphism */}
      <div className={cn(
        'absolute inset-0',
        isFeatured
          ? 'bg-mv-gradient-card'
          : 'bg-mv-hero-card backdrop-blur-[var(--mv-blur-md)]'
      )}>
        {/* Border glow effect */}
        <div className="absolute inset-0 rounded-[var(--mv-radius-card)] border border-[hsl(var(--mv-hero-card-border))]" />
      </div>

      {/* Content Container */}
      <div className="relative h-full flex flex-col">
        {/* Cover Image */}
        <div className={cn(
          'relative w-full overflow-hidden rounded-t-[var(--mv-radius-card)]',
          coverSizeClasses
        )}>
          {data.coverUrl ? (
            <img
              src={data.coverUrl}
              alt={data.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-accent/20 flex items-center justify-center">
              <span className="text-5xl md:text-6xl font-bold text-white/50">
                {data.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-mv-gradient-overlay" />

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="icon"
              className={cn(
                'rounded-full bg-primary shadow-[var(--shadow-glow-primary)] hover:scale-110 transition-transform duration-200',
                isLarge ? 'h-16 w-16' : 'h-14 w-14'
              )}
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className={isLarge ? 'h-7 w-7' : 'h-6 w-6'} />
              ) : (
                <Play className={cn(isLarge ? 'h-7 w-7' : 'h-6 w-6', 'ml-0.5')} />
              )}
            </Button>
          </div>

          {/* Type Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="backdrop-blur-md bg-black/40 text-white border-white/20">
              {data.type === 'track' && '🎵 Track'}
              {data.type === 'album' && '💿 Album'}
              {data.type === 'playlist' && '📁 Playlist'}
            </Badge>
          </div>

          {/* Metrics Badge (top right) */}
          {formattedPlayCount && (
            <div className="absolute top-3 right-3 flex gap-2">
              <Badge variant="secondary" className="backdrop-blur-md bg-black/40 text-white border-white/20 tabular-nums">
                ▶ {formattedPlayCount}
              </Badge>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
          {/* Title & Subtitle */}
          <div className="space-y-1 mb-3">
            <h3 className={cn(
              'font-bold text-foreground line-clamp-2 leading-tight',
              isLarge ? 'text-lg md:text-xl' : 'text-base md:text-lg'
            )}>
              {data.title}
            </h3>
            {data.subtitle && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {data.subtitle}
              </p>
            )}
          </div>

          {/* Tags */}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {data.tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-2 py-0.5 border-primary/30 text-primary"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Metrics Row */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground">
              {/* Duration or Track Count */}
              {data.type === 'track' && formattedDuration && (
                <span className="tabular-nums">{formattedDuration}</span>
              )}
              {(data.type === 'album' || data.type === 'playlist') && data.trackCount && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {data.trackCount} tracks
                </span>
              )}

              {/* Likes */}
              {formattedLikeCount && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Heart className="h-3.5 w-3.5" />
                  {formattedLikeCount}
                </span>
              )}

              {/* Relative Time */}
              {relativeTime && (
                <span className="hidden md:inline">{relativeTime}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Like Button */}
              {onLike && (
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    'h-8 w-8 rounded-full',
                    data.isLiked && 'text-red-500'
                  )}
                  onClick={handleLike}
                  aria-label={data.isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart className={cn('h-4 w-4', data.isLiked && 'fill-current')} />
                </Button>
              )}

              {/* More Menu */}
              {onMore && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={handleMore}
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Playing Indicator */}
      {isPlaying && (
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-primary/90 backdrop-blur-sm flex items-center gap-1.5 shadow-md">
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-white rounded-full animate-pulse"
                style={{
                  height: '12px',
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '0.8s',
                }}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-white">Playing</span>
        </div>
      )}
    </div>
  );
});

HeroCard.displayName = 'HeroCard';

/**
 * HeroCardSkeleton - Loading state for HeroCard
 */
export const HeroCardSkeleton = memo<{ size?: 'default' | 'large' }>(({ size = 'default' }) => {
  const isLarge = size === 'large';
  const cardHeight = isLarge ? 'h-[320px] md:h-[380px]' : 'h-[280px] md:h-[320px]';
  const coverHeight = isLarge ? 'h-[180px] md:h-[220px]' : 'h-[140px] md:h-[180px]';

  return (
    <div className={cn(
      'relative overflow-hidden rounded-[var(--mv-radius-card)] bg-mv-hero-card backdrop-blur-md',
      cardHeight
    )}>
      <div className="h-full flex flex-col">
        {/* Cover skeleton */}
        <Skeleton className={cn('w-full rounded-t-[var(--mv-radius-card)]', coverHeight)} />

        {/* Content skeleton */}
        <div className="flex-1 p-4 md:p-5 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex justify-between items-center pt-3">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

HeroCardSkeleton.displayName = 'HeroCardSkeleton';
