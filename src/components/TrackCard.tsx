import React, { useState, useMemo, useCallback, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Download, 
  Heart, 
  Share2, 
  MoreHorizontal, 
  Clock,
  Music,
  Headphones,
  Volume2,
  VolumeX,
  Eye,
  MoreVertical
} from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useTrackLike } from "@/hooks/useTrackLike";
import { withErrorBoundary } from "@/components/ErrorBoundary";
import { formatDuration } from "@/utils/formatters";
import { logError } from "@/utils/logger";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface Track {
  id: string;
  title: string;
  prompt: string;
  audio_url?: string;
  image_url?: string;
  cover_url?: string;
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  has_vocals?: boolean;
  genre?: string;
  style_tags?: string[];
  lyrics?: string;
  like_count?: number;
  view_count?: number;
}

interface TrackCardProps {
  track: Track;
  onDownload?: () => void;
  onShare?: () => void;
  onClick?: () => void;
}

const gradients = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-indigo-500 to-purple-500',
];

const TrackCardComponent = ({ track, onDownload, onShare, onClick }: TrackCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  
  // Проверяем валидность данных трека
  if (!track || !track.id) {
    logError('Invalid track data', 'TrackCard validation', 'TrackCard', { track });
    return (
      <Card className="p-4">
        <div className="text-center">
          <Music className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Некорректные данные трека</p>
        </div>
      </Card>
    );
  }

  const isCurrentTrack = currentTrack?.id === track.id;
  const canPlay = track.status === 'completed' && track.audio_url;

  // Мемоизируем проверку возможности воспроизведения
  const playButtonDisabled = useMemo(() => 
    !canPlay || track.status === 'processing',
    [track.audio_url, track.status]
  );

  // Мемоизируем обработчики событий
  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      toggleLike();
    } catch (error) {
      logError('TrackCard like error', 'TrackCard', 'TrackCard', { 
        error: error instanceof Error ? error.message : String(error),
        trackId: track.id, 
        trackTitle: track.title 
      });
    }
  }, [toggleLike, track.id, track.title]);
  
  const getStatusBadge = useCallback(() => {
    switch (track.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Готов</Badge>;
      case 'processing':
        return <Badge variant="secondary">Обработка</Badge>;
      case 'failed':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">{track.status}</Badge>;
    }
  }, [track.status]);

  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      if (isCurrentTrack && isPlaying) {
        togglePlayPause();
      } else {
        playTrack({
          id: track.id,
          title: track.title,
          audio_url: track.audio_url!,
          cover_url: track.cover_url,
          duration: track.duration,
          style_tags: track.style_tags,
          lyrics: track.lyrics,
        });
      }
    } catch (error) {
      logError('TrackCard play error', 'TrackCard', 'TrackCard', {
        error: error instanceof Error ? error.message : String(error),
        trackId: track.id,
        trackTitle: track.title,
        audioUrl: track.audio_url
      });
    }
  }, [isCurrentTrack, isPlaying, togglePlayPause, playTrack, track]);

  const formattedDuration = useMemo(() => {
    if (!track.duration) return null;
    return `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`;
  }, [track.duration]);

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${
        isCurrentTrack ? 'ring-2 ring-primary' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Cover Image */}
        <div className="relative aspect-square overflow-hidden">
          {track.image_url || track.cover_url ? (
            <img
              src={track.cover_url || track.image_url}
              alt={track.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradients[Math.abs(track.id.charCodeAt(0)) % gradients.length]} flex items-center justify-center`}>
              <Music className="w-16 h-16 text-white/80" />
            </div>
          )}
          
          {/* Play Button Overlay */}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
            isHovered || isCurrentTrack ? 'opacity-100' : 'opacity-0'
          }`}>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full w-16 h-16 bg-white/90 hover:bg-white text-black"
              onClick={handlePlayClick}
              disabled={playButtonDisabled}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            {getStatusBadge()}
          </div>

          {/* Actions Menu */}
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onDownload && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
                    <Download className="mr-2 h-4 w-4" />
                    Скачать
                  </DropdownMenuItem>
                )}
                {onShare && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Поделиться
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Track Info */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate mb-1">{track.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{track.prompt}</p>
            </div>
          </div>

          {/* Track Details */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-3">
              {formattedDuration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formattedDuration}</span>
                </div>
              )}
              {track.view_count !== undefined && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{track.view_count}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={handleLikeClick}
            >
              <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              {likeCount}
            </Button>

            <div className="flex gap-1">
              {onDownload && canPlay && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => { e.stopPropagation(); onDownload(); }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              {onShare && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => { e.stopPropagation(); onShare(); }}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TrackCard = withErrorBoundary(memo(TrackCardComponent), {
  fallback: (
    <Card className="p-4">
      <div className="text-center">
        <Music className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Ошибка отображения трека</p>
        <p className="text-xs text-muted-foreground mt-1">Проверьте консоль браузера для подробностей</p>
      </div>
    </Card>
  ),
  onError: (error, errorInfo) => {
    logError('TrackCard Error Boundary', 'TrackCard', 'ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }
});
