import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useSelectedTracks } from '@/contexts/SelectedTracksContext';
import { Play, Pause, MoreHorizontal, Download, Share2 } from 'lucide-react';
import type { Track } from '@/services/api.service';

interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: (track: Track) => void;
  onPause?: (track: Track) => void;
  onDownload?: (track: Track) => void;
  onShare?: (track: Track) => void;
  onMore?: (track: Track) => void;
  className?: string;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  isPlaying = false,
  onPlay,
  onPause,
  onDownload,
  onShare,
  onMore,
  className = '',
}) => {
  const { 
    isSelectionMode, 
    isTrackSelected, 
    toggleTrack 
  } = useSelectedTracks();

  const isSelected = isTrackSelected(track.id);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      toggleTrack(track.id);
    }
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      onPause?.(track);
    } else {
      onPlay?.(track);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload?.(track);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(track);
  };

  const handleMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMore?.(track);
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      toggleTrack(track.id);
    } else {
      toggleTrack(track.id);
    }
  };

  return (
    <Card 
      className={`
        group relative transition-all duration-200 hover:shadow-md
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isSelectionMode ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="absolute top-3 left-3 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              className="h-5 w-5 border-2 bg-background"
            />
          </div>
        )}

        {/* Track Image/Thumbnail */}
        <div className="relative aspect-square w-full rounded-lg bg-muted overflow-hidden mb-3">
          {track.cover_url ? (
            <img
              src={track.cover_url}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <span className="text-2xl font-bold text-primary">
                {track.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Play/Pause Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-primary/90 hover:bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Duration Badge */}
          {track.duration && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 right-2 text-xs bg-black/70 text-white"
            >
              {formatDuration(track.duration)}
            </Badge>
          )}
        </div>

        {/* Track Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {track.title}
          </h3>
          
          {track.genre && (
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {track.genre}
              </Badge>
            </div>
          )}

          {/* Track Status */}
          {track.status && (
            <Badge 
              variant={
                track.status === 'completed' ? 'default' :
                track.status === 'processing' ? 'secondary' :
                'destructive'
              }
              className="text-xs"
            >
              {track.status}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleMore}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Helper function to format duration
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}