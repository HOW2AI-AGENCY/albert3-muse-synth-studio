/**
 * TrackListItem - Mobile-optimized list view component
 * Pure presenter component for track display in list format
 * 
 * @usage <TrackListItem track={track} isPlaying={false} onPlay={handlePlay} />
 */

import React from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Track } from '@/types/track.types';
import { UnifiedTrackActionsMenu } from '@/components/tracks/shared/TrackActionsMenu.unified';
import type { UnifiedTrackActionsMenuProps } from '@/components/tracks/shared/TrackActionsMenu.types';

export interface TrackListItemProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: () => void;
  // All props for the action menu are now passed in a single object
  actionMenuProps?: Omit<UnifiedTrackActionsMenuProps, 'trackId' | 'trackStatus' | 'trackMetadata' | 'isLiked' | 'currentVersionId' | 'versionNumber' | 'isMasterVersion'>;
}

export const TrackListItem = React.memo<TrackListItemProps>(({
  track,
  isPlaying = false,
  onPlay,
  actionMenuProps,
}) => {
  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60); // Use Math.floor to avoid fractional seconds
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3",
      "active:bg-muted/50 transition-colors",
      "border-b border-border/30 last:border-0"
    )}>
      {/* Cover + Play Button */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 group">
        <img 
          src={track.cover_url || '/placeholder.svg'} 
          alt={track.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <button 
          onClick={onPlay}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-black/40 backdrop-blur-sm",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isPlaying && "opacity-100"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" fill="currentColor" />
          ) : (
            <Play className="w-5 h-5 text-white" fill="currentColor" />
          )}
        </button>
      </div>
      
      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h3 className={cn(
          "text-sm font-medium truncate",
          isPlaying ? "text-accent-primary" : "text-foreground"
        )}>
          {track.title}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {track.style_tags?.join(', ') || track.genre || 'Unknown'}
        </p>
      </div>
      
      {/* Duration + Menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDuration(track.duration_seconds)}
        </span>
        {actionMenuProps && (
          <UnifiedTrackActionsMenu
            trackId={track.id}
            trackStatus={track.status}
            trackMetadata={track.metadata}
            isLiked={false} // Track likes are not supported on list items yet
            currentVersionId={track.id} // Default to track id, can be overridden
            {...actionMenuProps}
            variant="minimal"
            layout="flat"
            showQuickActions={false}
          />
        )}
      </div>
    </div>
  );
});

TrackListItem.displayName = 'TrackListItem';
