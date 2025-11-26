import React, { useCallback, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/lazy-image';
import { Play, Pause, Heart } from '@/utils/iconImports';
import { TrackStatusBadge } from '@/components/tracks/TrackStatusBadge';
import { useCurrentTrack, useIsPlaying, useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useTrackLike } from '@/features/tracks/hooks';
import { formatDuration } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { TrackContextMenu } from '@/features/tracks/components/TrackContextMenu';
import type { TrackStatus } from '@/components/tracks/track-status.types';
import type { Track } from '@/types/domain/track.types';

interface TrackCardMobileProps {
  track: Track;
  onClick?: () => void;
  onDelete?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onDescribeTrack?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;
}

export const TrackCardMobile = memo(({ 
  track, 
  onClick,
  onDelete,
  onExtend,
  onCover,
  onSeparateStems,
  onAddVocal,
  onDescribeTrack,
  onCreatePersona,
  onRetry
}: TrackCardMobileProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);

  const isCurrentTrack = currentTrack?.id === track.id;
  const playButtonDisabled = track.status !== "completed" || !track.audio_url;

  const handlePlayClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playButtonDisabled) return;
    
    if (isCurrentTrack) {
      togglePlayPause();
    } else if (track.audio_url) {
      playTrack({
        id: track.id,
        title: track.title,
        audio_url: track.audio_url,
        cover_url: track.cover_url || undefined,
        duration: track.duration || undefined,
        style_tags: track.style_tags || undefined,
        status: track.status !== 'draft' ? track.status : 'pending',
      });
    }
  }, [playButtonDisabled, togglePlayPause, playTrack, track, isCurrentTrack]);

  const handleLikeClick = useCallback(() => {
    toggleLike();
  }, [toggleLike]);

  return (
    <TrackContextMenu
      track={track}
      onPlay={() => handlePlayClick({} as React.MouseEvent<Element>)}
      onLike={handleLikeClick}
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
      <Card
        onClick={onClick}
        className={cn(
          "overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 cursor-pointer",
          "border border-border/50 hover:border-primary/50 backdrop-blur-sm",
          "min-h-[100px] h-auto bg-gradient-to-br from-card to-card/50",
          isCurrentTrack && "ring-2 ring-primary shadow-glow-primary"
        )}
      >
      <div className="flex gap-3 p-4">
        {/* Optimized cover with glassmorphism overlay */}
        <div className="relative w-20 h-20 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg group-hover:shadow-glow-primary transition-shadow duration-300">
          <LazyImage
            src={track.cover_url || '/placeholder.svg'}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            wrapperClassName="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {track.status !== 'completed' && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-2">
            {/* Title */}
            <h3 className="text-base sm:text-sm font-semibold line-clamp-2 leading-tight">
              {track.title}
            </h3>
            
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <TrackStatusBadge 
                status={track.status as TrackStatus}
                variant="compact"
                showIcon={true}
              />
            </div>
            
            {/* Description */}
            {track.prompt && (
              <p className="text-xs text-muted-foreground/80 line-clamp-1 leading-relaxed">
                {track.prompt}
              </p>
            )}
            
            {/* Tags and duration */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {track.style_tags?.[0] && (
                <span className="truncate">{track.style_tags[0]}</span>
              )}
              {track.duration && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                  <span>{formatDuration(track.duration)}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Touch-optimized action buttons */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 sm:h-9 sm:w-9 rounded-full bg-primary/10 hover:bg-primary/20"
              onClick={handlePlayClick}
              disabled={playButtonDisabled}
              aria-label={isCurrentTrack && isPlaying ? "Пауза" : "Воспроизвести"}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="h-5 w-5 sm:h-4 sm:w-4" />
              ) : (
                <Play className="h-5 w-5 sm:h-4 sm:w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 sm:h-9 sm:w-9 rounded-full hover:bg-red-500/10"
              onClick={handleLikeClick}
              aria-label={isLiked ? "Убрать из избранного" : "Добавить в избранное"}
            >
              <Heart className={cn("h-5 w-5 sm:h-4 sm:w-4", isLiked && "fill-red-500 text-red-500")} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
    </TrackContextMenu>
  );
});

TrackCardMobile.displayName = 'TrackCardMobile';
