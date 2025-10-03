import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
}

const gradients = [
  'from-purple-500/20 to-pink-500/20',
  'from-blue-500/20 to-cyan-500/20',
  'from-green-500/20 to-emerald-500/20',
  'from-orange-500/20 to-red-500/20',
  'from-indigo-500/20 to-purple-500/20',
  'from-teal-500/20 to-blue-500/20'
];

const TrackCardComponent = ({ track, onDownload, onShare, onClick, className, variant = 'default' }: TrackCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const { toast } = useToast();
  
  // Проверяем валидность данных трека
  if (!track || !track.id) {
    logError('Invalid track data', undefined, 'TrackCard', { track });
    return (
      <Card className="p-4" role="alert" aria-label="Ошибка загрузки трека">
        <div className="text-center">
          <Music className="mx-auto h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
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
      
      // Показываем toast-уведомление
      toast({
        title: isLiked ? "Убрано из избранного" : "Добавлено в избранное",
        description: `Трек "${track.title}" ${isLiked ? 'убран из' : 'добавлен в'} избранное`,
        duration: 2000,
      });
    } catch (error) {
      logError('TrackCard like error', error instanceof Error ? error : new Error(String(error)), 'TrackCard', { 
        trackId: track.id, 
        trackTitle: track.title 
      });
      
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус избранного",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [toggleLike, track.id, track.title, isLiked, toast]);
  
  const getStatusBadge = useCallback(() => {
    switch (track.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500" aria-label="Статус: готов">Готов</Badge>;
      case 'processing':
        return <Badge variant="secondary" aria-label="Статус: обработка">Обработка</Badge>;
      case 'failed':
        return <Badge variant="destructive" aria-label="Статус: ошибка">Ошибка</Badge>;
      default:
        return <Badge variant="outline" aria-label={`Статус: ${track.status}`}>{track.status}</Badge>;
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
    
    try {
      if (!track.audio_url) {
        toast({
          title: "Ошибка скачивания",
          description: "Аудиофайл недоступен для скачивания",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      onDownload?.();
      
      toast({
        title: "Скачивание начато",
        description: `Трек "${track.title}" загружается`,
        duration: 3000,
      });
    } catch (error) {
      logError('TrackCard download error', error instanceof Error ? error : new Error(String(error)), 'TrackCard', {
        trackId: track.id,
        trackTitle: track.title
      });
      
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось скачать трек",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [onDownload, track.audio_url, track.title, toast]);

  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      onShare?.();
      
      toast({
        title: "Ссылка скопирована",
        description: `Ссылка на трек "${track.title}" скопирована в буфер обмена`,
        duration: 3000,
      });
    } catch (error) {
      logError('TrackCard share error', error instanceof Error ? error : new Error(String(error)), 'TrackCard', {
        trackId: track.id,
        trackTitle: track.title
      });
      
      toast({
        title: "Ошибка",
        description: "Не удалось поделиться треком",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [onShare, track.title, toast]);

  const handleCardClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const randomGradient = useMemo(() => {
    const index = track.id.charCodeAt(0) % gradients.length;
    return gradients[index];
  }, [track.id]);

  // Intersection Observer для анимации появления
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Компактный вариант карточки
  if (variant === 'compact') {
    return (
      <Card 
        ref={cardRef}
        className={cn(
          "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10",
          "border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90",
          "hover:scale-[1.02] hover:-translate-y-1",
          className
        )}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="article"
        aria-label={`Трек ${track.title || 'Без названия'}`}
        tabIndex={0}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Play Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayClick}
              disabled={playButtonDisabled}
              className={cn(
                "w-10 h-10 rounded-full transition-all duration-300",
                isCurrentTrack && isPlaying 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                  : "hover:bg-primary/10 hover:scale-110"
              )}
              aria-label={
                isCurrentTrack && isPlaying 
                  ? `Приостановить воспроизведение трека ${track.title}` 
                  : `Воспроизвести трек ${track.title}`
              }
              aria-pressed={isCurrentTrack && isPlaying}
            >
              {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{track.title || 'Без названия'}</h3>
              {track.prompt && (
                <p className="text-xs text-muted-foreground truncate">{track.prompt}</p>
              )}
            </div>

            {/* Duration */}
            {formattedDuration && (
              <span className="text-xs text-muted-foreground" aria-label={`Длительность: ${formattedDuration}`}>
                {formattedDuration}
              </span>
            )}

            {/* Actions */}
            <div className={cn(
              "flex items-center gap-1 transition-opacity duration-200",
              isHovered ? "opacity-100" : "opacity-0"
            )}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLikeClick}
                className={cn(
                  "w-8 h-8 p-0 transition-all duration-200",
                  isLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"
                )}
                aria-label={isLiked ? `Убрать из избранного: ${track.title}` : `Добавить в избранное: ${track.title}`}
                aria-pressed={isLiked}
              >
                <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-xl hover:shadow-primary/20",
        "border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/95",
        "hover:scale-[1.03] hover:-translate-y-2",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
        `before:${randomGradient}`,
        isCurrentTrack && 'ring-2 ring-primary/50',
        className
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`Трек ${track.title || 'Без названия'}`}
      tabIndex={0}
    >
      {/* Обложка трека */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 group-hover:shadow-lg transition-shadow duration-300">
        {track.cover_url || track.image_url ? (
          <img 
            src={track.cover_url || track.image_url} 
            alt={`Обложка трека ${track.title || 'Без названия'}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className={cn(
            "w-full h-full flex items-center justify-center bg-gradient-to-br transition-all duration-500",
            randomGradient,
            "group-hover:scale-110"
          )}>
            <Music className="w-12 h-12 text-primary/60" aria-hidden="true" />
          </div>
        )}
        
        {/* Оверлей с кнопкой воспроизведения */}
        <div className={cn(
          "absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-300",
          isHovered || (isCurrentTrack && isPlaying) ? 'opacity-100' : 'opacity-0'
        )}>
          <Button
            variant="secondary"
            size="lg"
            onClick={handlePlayClick}
            disabled={playButtonDisabled}
            className={cn(
              "rounded-full w-14 h-14 transition-all duration-300 shadow-lg",
              isCurrentTrack && isPlaying
                ? "bg-primary text-primary-foreground shadow-primary/25 animate-pulse-glow" 
                : "bg-white/90 hover:bg-white text-black hover:scale-110 hover:shadow-xl"
            )}
            aria-label={
              isCurrentTrack && isPlaying 
                ? `Приостановить воспроизведение трека ${track.title}` 
                : `Воспроизвести трек ${track.title}`
            }
            aria-pressed={isCurrentTrack && isPlaying}
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

      <CardContent className="relative p-4">
        {/* Заголовок */}
        <h3 className="font-semibold text-base mb-2 line-clamp-1 group-hover:text-primary transition-colors duration-300">
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
              <div className="flex items-center gap-1" aria-label={`Длительность: ${formattedDuration}`}>
                <Clock className="w-3 h-3" aria-hidden="true" />
                <span>{formattedDuration}</span>
              </div>
            )}
            
            {track.view_count !== undefined && (
              <div className="flex items-center gap-1" aria-label={`Просмотров: ${track.view_count}`}>
                <Eye className="w-3 h-3" aria-hidden="true" />
                <span>{track.view_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Теги стилей */}
        {track.style_tags && track.style_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3" role="list" aria-label="Теги стилей">
            {track.style_tags.slice(0, 2).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors duration-200"
                role="listitem"
              >
                {tag}
              </Badge>
            ))}
            {track.style_tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/20 text-primary" role="listitem">
                +{track.style_tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex items-center justify-between" role="toolbar" aria-label="Действия с треком">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLikeClick}
            className={cn(
              "transition-all duration-300 hover:scale-110",
              isLiked 
                ? 'text-red-500 hover:text-red-600 animate-pulse' 
                : 'hover:text-red-500'
            )}
            aria-label={isLiked ? `Убрать из избранного: ${track.title}` : `Добавить в избранное: ${track.title}`}
            aria-pressed={isLiked}
          >
            <Heart className={cn(
              "w-4 h-4 transition-all duration-200",
              isLiked && 'fill-current scale-110'
            )} />
            {likeCount > 0 && <span className="ml-1 text-xs" aria-label={`${likeCount} лайков`}>{likeCount}</span>}
          </Button>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadClick}
              disabled={!track.audio_url}
              className="hover:text-green-500 transition-all duration-200 hover:scale-110"
              aria-label={`Скачать трек ${track.title}`}
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareClick}
              className="hover:text-blue-500 transition-all duration-200 hover:scale-110"
              aria-label={`Поделиться треком ${track.title}`}
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
  FallbackComponent: ({ error }) => (
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

export default TrackCard;

// Добавляем CSS анимации в глобальные стили
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(var(--primary), 0.3); }
      50% { box-shadow: 0 0 30px rgba(var(--primary), 0.5); }
    }
    .animate-fade-in {
      animation: fade-in 0.6s ease-out;
    }
    .animate-pulse-glow {
      animation: pulse-glow 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}
