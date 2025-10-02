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
    logError('Invalid track data', undefined, 'TrackCard', { track });
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
      logError('TrackCard like error', error instanceof Error ? error : new Error(String(error)), 'TrackCard', { 
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
      logError('TrackCard play error', error instanceof Error ? error : new Error(String(error)), 'TrackCard', {
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

  const handleDownloadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload?.();
  }, [onDownload]);

  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.();
  }, [onShare]);

  const handleCardClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const randomGradient = useMemo(() => {
    const index = track.id.charCodeAt(0) % gradients.length;
    return gradients[index];
  }, [track.id]);

  return (
    <Card 
      className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
        isCurrentTrack ? 'ring-2 ring-primary/50' : ''
      }`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Обложка трека */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        {track.cover_url || track.image_url ? (
          <img 
            src={track.cover_url || track.image_url} 
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${randomGradient} flex items-center justify-center`}>
            <Music className="w-12 h-12 text-white/80" />
          </div>
        )}
        
        {/* Оверлей с кнопкой воспроизведения */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
          isHovered || (isCurrentTrack && isPlaying) ? 'opacity-100' : 'opacity-0'
        }`}>
          <Button
            variant="secondary"
            size="lg"
            onClick={handlePlayClick}
            disabled={playButtonDisabled}
            className="rounded-full w-16 h-16 bg-white/90 hover:bg-white text-black shadow-lg"
          >
            {isCurrentTrack && isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
        </div>

        {/* Статус индикатор */}
        <div className="absolute top-2 right-2">
          {getStatusBadge()}
        </div>
      </div>

      <CardContent className="p-4">
        {/* Заголовок */}
        <h3 className="font-semibold text-base mb-2 line-clamp-1">
          {track.title || 'Без названия'}
        </h3>
        
        {/* Промпт */}
        {track.prompt && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {track.prompt}
          </p>
        )}

        {/* Метаданные */}
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

        {/* Теги стилей */}
        {track.style_tags && track.style_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {track.style_tags.slice(0, 2).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
            {track.style_tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                +{track.style_tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLikeClick}
            className={`transition-colors ${
              isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            {likeCount > 0 && <span className="ml-1 text-xs">{likeCount}</span>}
          </Button>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadClick}
              disabled={!track.audio_url}
              className="hover:text-green-500"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareClick}
              className="hover:text-blue-500"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TrackCard = memo(withErrorBoundary(TrackCardComponent, {
  fallback: ({ error }) => (
    <Card className="p-4">
      <div className="text-center">
        <Music className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Ошибка загрузки трека</p>
        <p className="text-xs text-muted-foreground mt-1">{error?.message}</p>
      </div>
    </Card>
  ),
  onError: (error, errorInfo) => {
    logError('TrackCard component error', error, 'TrackCard', errorInfo);
  }
}));

TrackCard.displayName = 'TrackCard';
