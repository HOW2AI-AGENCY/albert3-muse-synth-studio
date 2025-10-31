import React, { useCallback, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/lazy-image';
import { Play, Pause, Heart, MoreVertical } from '@/utils/iconImports';
import { useCurrentTrack, useIsPlaying } from '@/stores/audioPlayerStore';
import { useTrackLike } from '@/features/tracks/hooks';
import { useSmartTrackPlay } from '@/hooks/useSmartTrackPlay';
import { formatDuration } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  cover_url?: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "failed";
  style_tags?: string[];
  like_count?: number;
}

interface TrackCardMobileProps {
  track: Track;
  onClick?: () => void;
  onMoreClick?: () => void;
}

export const TrackCardMobile = memo(({ track, onClick, onMoreClick }: TrackCardMobileProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const { playTrackSmart } = useSmartTrackPlay();
  const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const { toast } = useToast();

  const isCurrentTrack = currentTrack?.id === track.id;
  const playButtonDisabled = track.status !== "completed" || !track.audio_url;

  const handlePlayClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playButtonDisabled) return;
    
    const success = await playTrackSmart(track.id);
    if (!success) {
      toast({
        title: "Ошибка",
        description: "Не удалось начать воспроизведение",
        variant: "destructive",
      });
    }
  }, [playButtonDisabled, playTrackSmart, track.id, toast]);

  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike();
  }, [toggleLike]);

  const handleMoreClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMoreClick?.();
  }, [onMoreClick]);

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "overflow-hidden hover:shadow-lg transition-all h-auto cursor-pointer",
        isCurrentTrack && "ring-2 ring-primary"
      )}
    >
      <div className="flex gap-2 p-2">
        {/* Compact cover 60x60 */}
        <div className="relative w-15 h-15 rounded overflow-hidden flex-shrink-0">
          <LazyImage
            src={track.cover_url || '/placeholder.svg'}
            alt={track.title}
            className="w-full h-full object-cover"
            wrapperClassName="w-full h-full"
          />
          {track.status !== 'completed' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold truncate leading-tight">{track.title}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {track.style_tags?.[0] && (
                <span className="truncate">{track.style_tags[0]}</span>
              )}
              {track.duration && (
                <>
                  <span>•</span>
                  <span>{formatDuration(track.duration)}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Compact buttons */}
          <div className="flex items-center gap-0.5 mt-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 mobile-touch"
              onClick={handlePlayClick}
              disabled={playButtonDisabled}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 mobile-touch"
              onClick={handleLikeClick}
            >
              <Heart className={cn("h-3 w-3", isLiked && "fill-red-500 text-red-500")} />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 mobile-touch ml-auto"
              onClick={handleMoreClick}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});

TrackCardMobile.displayName = 'TrackCardMobile';
