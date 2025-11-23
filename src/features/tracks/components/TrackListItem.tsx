/**
 * @file TrackListItem.tsx
 * @description A performant, stylish, and accessible list item for a single track.
 * @version 2.0.0
 */

import { memo, useCallback } from 'react';
import { Play, Pause, Music, Headphones, Loader2, AlertTriangle, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying } from '@/stores/audioPlayerStore';
import { Badge } from '@/components/ui/badge';
import { UnifiedTrackActionsMenu } from '@/components/tracks/shared/TrackActionsMenu.unified';
import { useTrackVersionLike } from '@/features/tracks/hooks/useTrackVersionLike';
import { useDownloadTrack } from '@/hooks/useDownloadTrack';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { toast } from 'sonner';

// Simplified Track type for this component's needs
type TrackListItemData = {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_url?: string;
  cover_url?: string;
  duration?: number;
  style_tags?: string[];
  version_count?: number;
  is_public?: boolean;
  has_vocals?: boolean;
  like_count?: number;
};

interface TrackListItemProps {
  track: TrackListItemData;
  onSelect?: (track: TrackListItemData) => void;
  onDeleteSuccess?: (trackId: string) => void;
  className?: string;
}

const TrackListItemComponent = ({ track, onSelect, onDeleteSuccess, className }: TrackListItemProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);

  const { isLiked, toggleLike } = useTrackVersionLike(track.id, track.like_count || 0);
  const { downloadTrack, isDownloading } = useDownloadTrack();
  const { vibrate } = useHapticFeedback();

  const isCurrentTrack = currentTrack?.id === track.id || currentTrack?.parentTrackId === track.id;
  const isThisTrackPlaying = isCurrentTrack && isPlaying;
  const playButtonDisabled = track.status !== 'completed' || !track.audio_url;

  const handlePlayClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    vibrate('light');

    if (isCurrentTrack) {
      togglePlayPause();
    } else if (!playButtonDisabled) {
      playTrack({
        id: track.id,
        title: track.title,
        audio_url: track.audio_url!,
        cover_url: track.cover_url,
        duration: track.duration,
        style_tags: track.style_tags,
        status: track.status,
      });
    }
  }, [
    isCurrentTrack,
    playButtonDisabled,
    track,
    togglePlayPause,
    playTrack,
    vibrate,
  ]);

  const handleDownloadClick = useCallback(() => {
    if (!track.audio_url) {
      toast.error('Файл недоступен для скачивания');
      return;
    }
    downloadTrack({
      id: track.id,
      title: track.title,
      audio_url: track.audio_url,
    });
  }, [track, downloadTrack]);

  const renderStatusIndicator = () => {
    switch (track.status) {
      case 'processing':
      case 'pending':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return (
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 rounded-full bg-black/20 text-white hover:bg-black/40"
            onClick={handlePlayClick}
            disabled={playButtonDisabled}
            aria-label={isThisTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          >
            {isThisTrackPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
        );
    }
  };

  const formattedDuration = track.duration ? formatDuration(track.duration) : '0:00';
  const trackTags = track.style_tags?.slice(0, 2).join(' • ') || 'AI Music';

  return (
    <div
      data-testid={`track-list-item-${track.id}`}
      className={cn(
        "group flex items-center gap-3 p-2 rounded-lg transition-all duration-200 ease-in-out border-b border-transparent",
        "hover:bg-muted/60 focus-within:bg-muted/80",
        isCurrentTrack && "bg-primary/10 border-b-primary/20",
        className
      )}
      onClick={() => onSelect?.(track)}
      role="button"
      tabIndex={0}
      aria-label={`Select track: ${track.title}`}
    >
      {/* Cover Art & Play Button */}
      <div className="relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-card-foreground/5 shadow-inner">
        <img
          src={track.cover_url || '/placeholder.svg'}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
        />
        <div
          className={cn(
            "absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-200",
            isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {renderStatusIndicator()}
        </div>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-sm truncate", isCurrentTrack && "text-primary")}>
          {track.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isThisTrackPlaying && (
            <div className="flex items-center gap-1 text-primary">
              <Headphones className="h-3 w-3" />
              <span>Playing</span>
            </div>
          )}
          {!isThisTrackPlaying && (
            <>
              <span>{formattedDuration}</span>
              <span className="truncate hidden sm:inline">• {trackTags}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions & Badges */}
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        {track.version_count && track.version_count > 1 && (
          <Badge variant="secondary" className="hidden sm:block">
            V{track.version_count}
          </Badge>
        )}
        <UnifiedTrackActionsMenu
          trackId={track.id}
          trackStatus={track.status}
          isLiked={isLiked}
          onLike={toggleLike}
          onDownload={handleDownloadClick}
          onDelete={() => onDeleteSuccess?.(track.id)}
          // Pass other necessary props...
          variant="icon"
          triggerIcon={<MoreVertical className="h-5 w-5" />}
        />
      </div>
    </div>
  );
};

export const TrackListItem = memo(TrackListItemComponent);
