/**
 * TrackListItem - Compact row component for displaying tracks in list view
 * Optimized for space efficiency while showing all essential track information
 */
import { memo, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, Pause, MoreHorizontal } from '@/utils/iconImports';
import { useSelectedTracks } from '@/contexts/selected-tracks/useSelectedTracks';
import type { Track } from '@/services/tracks/track.service';
import { TrackBadge, TrackBadgeGroup } from './TrackBadge';
import { TrackMetrics } from './TrackMetrics';
import { cn } from '@/lib/utils';

export interface TrackListItemProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: (track: Track) => void;
  onPause?: (track: Track) => void;
  onMore?: (track: Track) => void;
  onClick?: (track: Track) => void;
  className?: string;
}

/**
 * TrackListItem - Compact row component for list view
 *
 * Features:
 * - Compact horizontal layout
 * - Cover thumbnail
 * - Track info with badges
 * - Metrics display
 * - Play/pause controls
 * - Context menu
 * - Selection mode support
 * - Hover states
 *
 * @component
 * @example
 * ```tsx
 * <TrackListItem
 *   track={track}
 *   isPlaying={currentTrack?.id === track.id}
 *   onPlay={handlePlay}
 *   onPause={handlePause}
 *   onMore={handleMore}
 * />
 * ```
 */
export const TrackListItem = memo<TrackListItemProps>(
  ({
    track,
    isPlaying = false,
    onPlay,
    onPause,
    onMore,
    onClick,
    className,
  }) => {
    const {
      isSelectionMode,
      isTrackSelected,
      toggleTrack,
    } = useSelectedTracks();

    // Memoize selection check
    const isSelected = useMemo(
      () => isTrackSelected(track.id),
      [isTrackSelected, track.id]
    );

    // Stable callback references
    const handleClick = useCallback(() => {
      if (isSelectionMode) {
        toggleTrack(track.id);
      } else {
        onClick?.(track);
      }
    }, [isSelectionMode, toggleTrack, track, onClick]);

    const handlePlayPause = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPlaying) {
          onPause?.(track);
        } else {
          onPlay?.(track);
        }
      },
      [isPlaying, onPause, onPlay, track]
    );

    const handleMore = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onMore?.(track);
      },
      [onMore, track]
    );

    const handleCheckboxChange = useCallback(
      (_checked: boolean) => {
        toggleTrack(track.id);
      },
      [toggleTrack, track.id]
    );

    return (
      <div
        className={cn(
          'group flex items-center gap-3 p-3 rounded-lg transition-all duration-150',
          'hover:bg-accent/50',
          isSelected && 'bg-primary/10 ring-1 ring-primary',
          isSelectionMode && 'cursor-pointer',
          !isSelectionMode && onClick && 'cursor-pointer',
          className
        )}
        onClick={handleClick}
      >
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            className="h-4 w-4 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Play/Pause Button */}
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'h-10 w-10 flex-shrink-0 rounded-full transition-all',
            isPlaying && 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Cover Thumbnail */}
        <div className="relative h-12 w-12 flex-shrink-0 rounded-md bg-muted overflow-hidden">
          {track.cover_url ? (
            <img
              src={track.cover_url}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <span className="text-sm font-bold text-primary">
                {track.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Status indicator overlay */}
          {track.status === 'processing' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        {/* Track Info - grows to fill available space */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title */}
          <h4 className="font-medium text-sm leading-tight truncate">
            {track.title}
          </h4>

          {/* Badges and Metrics */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Track Type Badges */}
            <TrackBadgeGroup>
              {/* Vocal/Instrumental */}
              {track.lyrics || track.has_vocals ? (
                <TrackBadge type="vocals" size="xs" showIcon={false} />
              ) : (
                <TrackBadge type="instrumental" size="xs" showIcon={false} />
              )}

              {/* Stems indicator */}
              {track.has_stems && (
                <TrackBadge type="stems" size="xs" showIcon={false} />
              )}

              {/* Version badge removed */}
            </TrackBadgeGroup>

            {/* Separator */}
            <span className="text-muted-foreground/30">•</span>

            {/* Metrics */}
            <TrackMetrics
              duration={track.duration || undefined}
              likes={track.like_count || 0}
              layout="compact"
              size="sm"
              display={['duration', 'likes']}
            />
          </div>
        </div>

        {/* Desktop: Genre and Status - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {track.genre && (
            <span className="text-xs text-muted-foreground">{track.genre}</span>
          )}
          {track.status && track.status !== 'completed' && (
            <span
              className={cn(
                'text-xs font-medium',
                track.status === 'processing' && 'text-blue-600',
                track.status === 'failed' && 'text-destructive'
              )}
            >
              {track.status}
            </span>
          )}
        </div>

        {/* More Button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleMore}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

TrackListItem.displayName = 'TrackListItem';
