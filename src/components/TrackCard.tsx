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

export const TrackCard = withErrorBoundary(
  memo(TrackCardComponent),
  (
    <Card className="p-4">
      <div className="text-center">
        <Music className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Ошибка отображения трека</p>
        <p className="text-xs text-muted-foreground mt-1">Проверьте консоль браузера для подробностей</p>
      </div>
    </Card>
  ),
  (error, errorInfo) => {
    logError('TrackCard Error Boundary', error, 'ErrorBoundary', {
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }
);

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, Share2, Heart, MoreVertical, Clock, User } from "lucide-react";
import { Track } from "@/services/api.service";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  showActions?: boolean;
  variant?: "default" | "compact" | "featured";
}

export const TrackCard = ({ 
  track, 
  isPlaying = false, 
  onPlay, 
  onPause,
  showActions = true,
  variant = "default"
}: TrackCardProps) => {
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlayPause = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (isPlaying) {
        onPause?.();
      } else {
        onPlay?.();
      }
    } catch (error) {
      console.error('Error playing track:', error);
      toast({
        title: "Ошибка воспроизведения",
        description: "Не удалось воспроизвести трек",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!track.audio_url) {
      toast({
        title: "Недоступно",
        description: "Аудиофайл недоступен для скачивания",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${track.title || 'track'}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Успешно",
        description: "Трек скачан",
      });
    } catch (error) {
      console.error('Error downloading track:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось скачать трек",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share && track.is_public) {
      try {
        await navigator.share({
          title: track.title || 'Музыкальный трек',
          text: `Послушайте этот трек: ${track.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Скопировано",
          description: "Ссылка скопирована в буфер обмена",
        });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать ссылку",
          variant: "destructive",
        });
      }
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Удалено из избранного" : "Добавлено в избранное",
      description: track.title || "Трек",
    });
  };

  const getStatusBadge = () => {
    switch (track.status) {
      case 'completed':
        return <Badge variant="success" className="animate-pulse-glow">Готов</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="animate-pulse">Обработка</Badge>;
      case 'failed':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const cardVariant = variant === "featured" ? "gradient" : variant === "compact" ? "modern" : "interactive";

  return (
    <Card 
      variant={cardVariant}
      className={`group hover-lift transition-all duration-300 ${
        variant === "featured" ? "border-primary/30 shadow-lg shadow-primary/10" : ""
      } ${variant === "compact" ? "p-2" : ""}`}
    >
      <CardHeader className={variant === "compact" ? "pb-2" : "pb-3"}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className={`${variant === "compact" ? "text-sm" : "text-base"} truncate ${
              variant === "featured" ? "text-gradient-primary" : ""
            }`}>
              {track.title || "Без названия"}
            </CardTitle>
            
            {variant !== "compact" && (
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {track.profiles?.username && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{track.profiles.username}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(track.created_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Скачать
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Поделиться
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLike}>
                    <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    {isLiked ? 'Убрать из избранного' : 'В избранное'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={variant === "compact" ? "pt-0" : ""}>
        {track.style_tags && track.style_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {track.style_tags.slice(0, variant === "compact" ? 2 : 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs px-2 py-0.5 hover:bg-primary/10 transition-colors"
              >
                {tag}
              </Badge>
            ))}
            {track.style_tags.length > (variant === "compact" ? 2 : 3) && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                +{track.style_tags.length - (variant === "compact" ? 2 : 3)}
              </Badge>
            )}
          </div>
        )}

        {track.prompt && variant !== "compact" && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {track.prompt}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant={variant === "featured" ? "hero" : "modern"}
            size={variant === "compact" ? "sm" : "default"}
            onClick={handlePlayPause}
            disabled={!track.audio_url || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {variant !== "compact" && (isPlaying ? "Пауза" : "Играть")}
          </Button>

          {variant !== "compact" && showActions && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`transition-colors ${isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="hover:text-primary"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={!track.audio_url}
                className="hover:text-secondary"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
