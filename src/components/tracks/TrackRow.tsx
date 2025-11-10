/**
 * TrackRow Component - REFACTORED
 *
 * This version is refactored to directly use the new `useTrackVariants` hook
 * and its data structure (`mainTrack`, `variants`), removing the legacy compatibility layer.
 */

import { memo, useCallback, useState, useMemo } from 'react';
import { Play, Pause, Heart, MoreVertical, Eye, MessageSquare, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TrackRowProps, TrackStatus } from '@/types/suno-ui.types';
import { TrackActionsMenu } from './TrackActionsMenu';
import { useTrackVariants } from '@/features/tracks/hooks/useTrackVariants';
import { TrackVariantSelector } from '@/features/tracks/components/TrackVariantSelector';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import type { AudioPlayerTrack } from '@/types/track';

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getStatusBadge = (status: TrackStatus) => {
  const config: Record<TrackStatus, { label: string; variant: any; className: string }> = {
    draft: { label: 'Draft', variant: 'secondary', className: 'bg-muted text-muted-foreground' },
    queued: { label: 'Queued', variant: 'secondary', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    processing: { label: 'Processing', variant: 'default', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 animate-pulse' },
    ready: { label: 'Ready', variant: 'default', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    failed: { label: 'Failed', variant: 'destructive', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    published: { label: 'Published', variant: 'default', className: 'bg-primary/10 text-primary' },
    deleted: { label: 'Deleted', variant: 'secondary', className: 'bg-muted text-muted-foreground line-through' },
  };
  return config[status] || config.draft;
};

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const TrackRow = memo<TrackRowProps>(({ 
  track,
  showMenu = true,
  showStats = true,
  showBadges = true,
  isSelected = false,
  isPlaying = false,
  onPlay,
  onPause,
  onOpenInspector,
  onPublish,
  onLike,
  onUnlike,
  menu,
  ariaLabel,
  ariaSelected,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0); // 0 is mainTrack, 1+ are variants

  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);

  const statusBadge = useMemo(() => getStatusBadge(track.status), [track.status]);
  const canPlay = useMemo(() => track.status === 'ready' || track.status === 'published', [track.status]);
  const showProcessing = useMemo(() => track.status === 'processing' || track.status === 'queued', [track.status]);

  const { data: variantsData, isLoading } = useTrackVariants(track.id, true);

  const displayedVersion = useMemo(() => {
    if (!variantsData) return null;
    if (selectedVersionIndex === 0) return variantsData.mainTrack;
    return variantsData.variants[selectedVersionIndex - 1] || null;
  }, [variantsData, selectedVersionIndex]);

  const totalVersions = (variantsData?.variants.length ?? 0) + 1;

  const displayCoverUrl = displayedVersion?.coverUrl ?? track.thumbnailUrl;
  const displayTitle = displayedVersion?.title ?? track.title;
  const displayDurationSec = displayedVersion?.duration ?? track.durationSec;
  // Note: like count is handled by a separate hook now, this is a fallback.
  const displayLikeCount = track.stats.likes;

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isPlaying && onPause) {
      onPause(track.id);
      return;
    }
    
    if (displayedVersion?.audioUrl) {
      const versionToPlay: AudioPlayerTrack = {
        id: displayedVersion.id!,
        title: displayedVersion.title || track.title,
        audio_url: displayedVersion.audioUrl,
        cover_url: displayedVersion.coverUrl,
        duration: displayedVersion.duration,
        style_tags: displayedVersion.styleTags,
        lyrics: displayedVersion.lyrics,
        status: 'completed',
        parentTrackId: track.id,
        versionNumber: selectedVersionIndex + 1,
        isMasterVersion: variantsData?.preferredVariant?.id === displayedVersion.id,
      };
      playTrack(versionToPlay);
    } else if (onPlay) {
      onPlay(track.id);
    }
  }, [isPlaying, onPlay, onPause, track.id, displayedVersion, selectedVersionIndex, variantsData, playTrack]);

  const handleLikeToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (track.flags.liked && onUnlike) {
      onUnlike(track.id);
    } else if (!track.flags.liked && onLike) {
      onLike(track.id);
    }
  }, [track.flags.liked, track.id, onLike, onUnlike]);

  const handleRowClick = useCallback(() => {
    if (onOpenInspector) {
      onOpenInspector(track.id);
    }
  }, [onOpenInspector, track.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handlePlayPause(e as any);
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        setMenuOpen(true);
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        handleLikeToggle(e as any);
        break;
    }
  }, [handlePlayPause, handleLikeToggle]);

  return (
    <div
      role="listitem"
      aria-label={ariaLabel || `Track: ${track.title}`}
      aria-selected={ariaSelected !== undefined ? ariaSelected : isSelected}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleRowClick}
      className={cn(
        'group relative flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
        'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'border border-transparent hover:border-accent',
        isSelected && 'bg-accent/30 border-accent',
        isPlaying && 'bg-primary/5 border-primary/30',
        track.status === 'deleted' && 'opacity-50 pointer-events-none',
        'cursor-pointer'
      )}
    >
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'relative w-14 h-14 rounded-md overflow-hidden bg-muted',
            'ring-2 ring-transparent transition-all',
            isPlaying && 'ring-primary'
          )}
        >
          {displayCoverUrl ? (
            <img src={displayCoverUrl} alt={`${displayTitle} cover`} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40" />
            </div>
          )}

          {canPlay && (
            <button
              onClick={handlePlayPause}
              disabled={!canPlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              aria-pressed={isPlaying}
              className={cn(
                'absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100',
                'transition-opacity duration-200',
                isPlaying && 'opacity-100',
                'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
            >
              {isPlaying ? <Pause className="w-6 h-6 text-white" fill="currentColor" /> : <Play className="w-6 h-6 text-white" fill="currentColor" />}
            </button>
          )}

          {showProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && totalVersions > 1 && (
            <div className="absolute -top-1 -right-1 z-10" onClick={(e) => e.stopPropagation()} data-testid="version-selector">
              <TrackVariantSelector
                trackId={track.id}
                currentVersionIndex={selectedVersionIndex}
                onVersionChange={(index) => {
                  setSelectedVersionIndex(index);
                  const newVersion = index === 0 ? variantsData?.mainTrack : variantsData?.variants[index - 1];
                  if (currentTrack?.parentTrackId === track.id && newVersion?.audioUrl) {
                    const versionToPlay: AudioPlayerTrack = {
                      id: newVersion.id!,
                      title: newVersion.title || track.title,
                      audio_url: newVersion.audioUrl,
                      cover_url: newVersion.coverUrl,
                      duration: newVersion.duration,
                      style_tags: newVersion.styleTags,
                      lyrics: newVersion.lyrics,
                      status: 'completed',
                      parentTrackId: track.id,
                      versionNumber: index + 1,
                      isMasterVersion: variantsData?.preferredVariant?.id === newVersion.id,
                    };
                    playTrack(versionToPlay);
                  }
                }}
                className="scale-75 origin-top-right"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={cn('text-sm font-semibold truncate mb-1', 'text-foreground group-hover:text-primary transition-colors', isPlaying && 'text-primary')} title={displayTitle}>
          {displayTitle}
        </h3>

        {!isLoading && totalVersions > 1 && (
          <div className="flex items-center gap-1 mb-1">
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-1">
              <span>{`V${selectedVersionIndex + 1}`}</span>
              {variantsData?.preferredVariant?.id === displayedVersion?.id && (
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              )}
              {variantsData?.variants && variantsData.variants.length > 0 && (
                <span className="text-muted-foreground">{`+${variantsData.variants.length}`}</span>
              )}
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {track.summary || track.meta ? <span className="truncate">{track.summary || track.meta}</span> : null}
          {displayDurationSec && displayDurationSec > 0 && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="font-mono">{formatDuration(displayDurationSec)}</span>
            </>
          )}
        </div>

        {showBadges && track.badges.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            {track.badges.map((badge, idx) => (
              <Badge key={`${badge}-${idx}`} variant="secondary" className="h-4 px-1.5 text-[10px] font-medium">{badge}</Badge>
            ))}
            <Badge variant="secondary" className={cn('h-4 px-1.5 text-[10px] font-medium', statusBadge.className)}>{statusBadge.label}</Badge>
          </div>
        )}

        {track.status === 'failed' && track.errorMessage && (
          <Tooltip>
            <TooltipTrigger asChild><p className="text-xs text-destructive truncate mt-1 cursor-help">{track.errorMessage}</p></TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs"><p className="text-xs">{track.errorMessage}</p></TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {showStats && (
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild><div className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /><span>{formatCount(track.stats.plays)}</span></div></TooltipTrigger>
              <TooltipContent><p>{track.stats.plays.toLocaleString()} plays</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><div className="flex items-center gap-1"><Heart className={cn('w-3.5 h-3.5', track.flags.liked && 'fill-red-500 text-red-500')} /><span>{formatCount(displayLikeCount)}</span></div></TooltipTrigger>
              <TooltipContent><p>{displayLikeCount.toLocaleString()} likes</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><div className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /><span>{formatCount(track.stats.comments)}</span></div></TooltipTrigger>
              <TooltipContent><p>{track.stats.comments.toLocaleString()} comments</p></TooltipContent>
            </Tooltip>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLikeToggle} aria-label={track.flags.liked ? 'Unlike' : 'Like'}><Heart className={cn('w-4 h-4 transition-all', track.flags.liked && 'fill-red-500 text-red-500 scale-110')} /></Button></TooltipTrigger>
          <TooltipContent><p>{track.flags.liked ? 'Unlike' : 'Like'}</p></TooltipContent>
        </Tooltip>

        {!track.flags.published && onPublish && track.status === 'ready' && (
          <Button variant="default" size="sm" className="h-8 px-3 text-xs" onClick={(e) => { e.stopPropagation(); onPublish(track.id); }}>Publish</Button>
        )}

        {showMenu && (
          <TrackActionsMenu
            trackId={track.id}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            trigger={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()} aria-label="Track actions menu" aria-haspopup="menu" aria-expanded={menuOpen}><MoreVertical className="w-4 h-4" /></Button>}
            {...menu}
          />
        )}
      </div>
    </div>
  );
});

TrackRow.displayName = 'TrackRow';
