/**
 * @file TrackListItem.tsx
 * @description A performant, stylish, and accessible list item for a single track.
 * @version 2.0.0
 */

import { memo, useCallback } from 'react';
import { Play, Pause, Headphones, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying } from '@/stores/audioPlayerStore';
import { Badge } from '@/components/ui/badge';
import { useTrackVersionLike } from '@/features/tracks/hooks/useTrackVersionLike';
import { useDownloadTrack } from '@/hooks/useDownloadTrack';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { toast } from 'sonner';
import { TrackContextMenu } from './TrackContextMenu';
import type { Track } from '@/types/domain/track.types';

// Track type that matches database schema
interface TrackListItemProps {
  track: Track;
  onSelect?: (track: Track) => void;
  onDelete?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onDescribeTrack?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;
  className?: string;
}

const TrackListItemComponent = ({ 
  track, 
  onSelect, 
  onDelete,
  onExtend,
  onCover,
  onSeparateStems,
  onAddVocal,
  onDescribeTrack,
  onCreatePersona,
  onRetry,
  className 
}: TrackListItemProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);

  const { isLiked, toggleLike } = useTrackVersionLike(track.id, track.like_count || 0);
  const { downloadTrack } = useDownloadTrack();
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
        cover_url: track.cover_url || undefined,
        duration: track.duration || undefined,
        style_tags: track.style_tags || undefined,
        status: track.status !== 'draft' ? track.status : 'pending',
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
    <TrackContextMenu
      track={track}
      onPlay={() => handlePlayClick({} as React.MouseEvent<Element>)}
      onLike={toggleLike}
      onDownload={handleDownloadClick}
      onDelete={onDelete ? () => onDelete(track.id) : undefined}
      onExtend={onExtend ? () => onExtend(track.id) : undefined}
      onCover={onCover ? () => onCover(track.id) : undefined}
      onSeparateStems={onSeparateStems ? () => onSeparateStems(track.id) : undefined}
      onAddVocal={onAddVocal ? () => onAddVocal(track.id) : undefined}
      onDescribeTrack={onDescribeTrack ? () => onDescribeTrack(track.id) : undefined}
      onCreatePersona={onCreatePersona ? () => onCreatePersona(track.id) : undefined}
      onRetry={onRetry ? () => onRetry(track.id) : undefined}
      isLiked={isLiked}
    >
      <div
        data-testid={`track-list-item-${track.id}`}
        className={cn(
          "group flex items-center gap-4 p-3 rounded-xl transition-all duration-300",
          "hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent-secondary/5",
          "border border-border/50 hover:border-primary/30",
          "backdrop-blur-sm bg-card/50",
          isCurrentTrack && "bg-gradient-to-r from-primary/10 to-accent-secondary/10 border-primary/50 shadow-glow-primary",
          className
        )}
        onClick={() => onSelect?.(track)}
        role="button"
        tabIndex={0}
        aria-label={`Select track: ${track.title}`}
      >
      {/* Cover Art & Play Button */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden shadow-lg group-hover:shadow-glow-primary transition-shadow duration-300">
        <img
          src={track.cover_url || '/placeholder.svg'}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
        />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center transition-opacity duration-300",
            isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {renderStatusIndicator()}
        </div>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-semibold text-base mb-1 truncate transition-colors duration-200",
          isCurrentTrack && "text-primary"
        )}>
          {track.title}
        </p>
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          {isThisTrackPlaying && (
            <div className="flex items-center gap-1.5 text-primary animate-pulse">
              <Headphones className="h-4 w-4" />
              <span className="font-medium">Playing</span>
            </div>
          )}
          {!isThisTrackPlaying && (
            <>
              <span className="font-medium">{formattedDuration}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span className="truncate">{trackTags}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions & Badges */}
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        {typeof track.metadata === 'object' && track.metadata !== null && 'version_count' in track.metadata && 
         typeof track.metadata.version_count === 'number' && track.metadata.version_count > 1 && (
          <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
            V{track.metadata.version_count}
          </Badge>
        )}
      </div>
    </div>
    </TrackContextMenu>
  );
};

export const TrackListItem = memo(TrackListItemComponent);
