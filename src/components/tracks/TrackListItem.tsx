import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Heart, 
  Download, 
  Share2, 
  MoreHorizontal,
  Clock,
  Music,
  Headphones
} from 'lucide-react';
import { useAudioPlayer, useAudioPlayerSafe } from '@/hooks/useAudioPlayer';
import { useToast } from '@/hooks/use-toast';
import { useTrackLike } from '@/hooks/useTrackLike';
import { cn } from '@/lib/utils';
import { DisplayTrack, convertToAudioPlayerTrack } from '../../types/track';

interface TrackListItemProps {
  track: DisplayTrack;
  index?: number;
  onClick?: () => void;
  onDownload?: (trackId: string) => void;
  onShare?: (trackId: string) => void;
  className?: string;
  compact?: boolean;
}

export const TrackListItem: React.FC<TrackListItemProps> = memo(({
  track,
  index,
  onDownload,
  onShare,
  className,
  compact = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack 
  } = useAudioPlayerSafe();

  const { toast } = useToast();
  
  // Используем hook для лайков
  const { isLiked, likeCount, toggleLike, isLoading: isLikeLoading } = useTrackLike(
    track.id, 
    track.like_count || 0
  );

  // Мемоизируем обработчик лайка
  const handleLike = useCallback(() => {
    toggleLike();
  }, [toggleLike]);

  const handleDownload = useCallback(async () => {
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

      // Инкрементируем счетчик скачиваний
      try {
        const { error } = await supabase.rpc('increment_download_count', { 
          track_id: track.id 
        });
        if (error) console.error('Error incrementing download count:', error);
      } catch (error) {
        console.error('Error tracking download:', error);
      }

      // Открываем файл для скачивания
      const link = document.createElement('a');
      link.href = track.audio_url;
      link.download = `${track.title}.mp3`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onDownload?.(track.id);
      
      toast({
        title: "Скачивание начато",
        description: `Трек "${track.title}" загружается`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось скачать трек",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [onDownload, track.id, track.title, track.audio_url, toast]);

  const handleShare = useCallback(() => {
    try {
      onShare?.(track.id);
      
      toast({
        title: "Ссылка скопирована",
        description: `Ссылка на трек "${track.title}" скопирована в буфер обмена`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось поделиться треком",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [onShare, track.id, track.title, toast]);

  // Intersection Observer для анимации появления
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const isCurrentTrack = currentTrack?.id === track.id;

  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const handlePlayClick = useCallback(() => {
    if (!track.audio_url) return;
    
    const audioPlayerTrack = convertToAudioPlayerTrack(track);
    if (!audioPlayerTrack) return;

    if (isCurrentTrack && isPlaying) {
      pauseTrack();
    } else {
      playTrack(audioPlayerTrack);
    }
  }, [track, isCurrentTrack, isPlaying, playTrack, pauseTrack]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={itemRef}
      data-testid={`track-list-item-${track.id}`}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ease-out",
        "hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10",
        "hover:shadow-lg hover:shadow-primary/10",
        "border border-transparent hover:border-primary/20",
        "backdrop-blur-sm",
        isCurrentTrack && "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        compact ? "py-2" : "py-3",
        className
      )}
      style={{
        transitionDelay: `${index ? index * 50 : 0}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Декоративный градиентный фон */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Номер трека / Обложка */}
      <div className="relative flex-shrink-0">
        {compact && index !== undefined ? (
          <div className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300",
            "bg-gradient-to-br from-primary/20 to-primary/10",
            "group-hover:from-primary/30 group-hover:to-primary/20",
            isCurrentTrack && "from-primary/40 to-primary/30"
          )}>
            <span className="text-xs font-medium text-primary">
              {index + 1}
            </span>
          </div>
        ) : (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 group-hover:shadow-lg transition-all duration-300">
            {track.cover_url ? (
              <img
                src={track.cover_url}
                alt={track.title}
                className={cn(
                  "w-full h-full object-cover transition-all duration-500",
                  "group-hover:scale-110",
                  isImageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setIsImageLoaded(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-5 w-5 text-primary/60" />
              </div>
            )}
            
            {/* Оверлей с кнопкой воспроизведения */}
            <div className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300",
              "opacity-0 group-hover:opacity-100",
              isCurrentlyPlaying && "opacity-100"
            )}>
              <Button
                size="sm"
                variant="ghost"
                aria-label={isCurrentlyPlaying ? 'Пауза' : 'Воспроизвести'}
                disabled={!track.audio_url}
                className={cn(
                  "h-8 w-8 p-0 rounded-full transition-all duration-300",
                  "hover:scale-110 active:scale-95",
                  track.audio_url 
                    ? "bg-white/20 hover:bg-white/30" 
                    : "bg-gray-300/50 cursor-not-allowed",
                  isCurrentlyPlaying && "animate-pulse"
                )}
                onClick={handlePlayClick}
              >
                {isCurrentlyPlaying ? (
                  <Pause className={cn("h-3 w-3", track.audio_url ? "text-white" : "text-gray-500")} />
                ) : (
                  <Play className={cn("h-3 w-3 ml-0.5", track.audio_url ? "text-white" : "text-gray-500")} />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Информация о треке */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            "font-medium text-foreground truncate transition-colors duration-300",
            "group-hover:text-primary",
            isCurrentTrack && "text-primary",
            compact ? "text-sm" : "text-base"
          )}>
            {track.title}
          </h3>
          
          {/* Индикатор воспроизведения */}
          {isCurrentlyPlaying && (
            <div className="flex items-center gap-1">
              <div className="flex space-x-0.5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-primary rounded-full animate-pulse"
                    style={{
                      height: '12px',
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '1s'
                    }}
                  />
                ))}
              </div>
              <Headphones className="h-3 w-3 text-primary animate-pulse" />
            </div>
          )}
        </div>

        {/* Теги стиля */}
        {track.style_tags && !compact && (
          <div className="flex flex-wrap gap-1">
            {track.style_tags.slice(0, 3).map((style, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className={cn(
                  "text-xs px-2 py-0.5 transition-all duration-300",
                  "bg-primary/10 text-primary/80 border-primary/20",
                  "group-hover:bg-primary/20 group-hover:text-primary",
                  "hover:scale-105"
                )}
              >
                {style.trim()}
              </Badge>
            ))}
          </div>
        )}

        {/* Статус и длительность */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {track.status && (
            <Badge
              variant={
                track.status === 'completed' ? 'default' : 
                track.status === 'failed' ? 'destructive' : 
                'secondary'
              }
              className={cn(
                "text-xs px-2 py-0.5 transition-all duration-300",
                track.status === 'completed'
                  ? "bg-green-500/10 text-green-600 border-green-500/20" 
                  : track.status === 'failed'
                  ? "bg-red-500/10 text-red-600 border-red-500/20"
                  : track.status === 'processing'
                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                  : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
              )}
            >
              {track.status === 'completed' ? 'Готово' : 
               track.status === 'failed' ? 'Ошибка' :
               track.status === 'processing' ? 'Генерация' : 
               'В ожидании'}
            </Badge>
          )}
          
          {track.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(track.duration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Действия */}
      <div className={cn(
        "flex items-center gap-1 transition-all duration-300",
        "opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0",
        isHovered && "opacity-100 translate-x-0"
      )}>
        {/* Кнопка лайка */}
        <Button
          size="sm"
          variant="ghost"
          aria-label={isLiked ? 'Убрать из избранного' : 'Добавить в избранное'}
          disabled={isLikeLoading}
          className={cn(
            "h-8 w-8 p-0 rounded-full transition-all duration-300",
            "hover:bg-red-500/10 hover:text-red-500 hover:scale-110",
            "active:scale-95",
            isLiked && "text-red-500 bg-red-500/10",
            isLikeLoading && "opacity-50 cursor-not-allowed"
          )}
          onClick={handleLike}
        >
          <Heart className={cn(
            "h-4 w-4 transition-all duration-300",
            isLiked && "fill-current scale-110"
          )} />
        </Button>

        {/* Кнопка скачивания */}
        <Button
          size="sm"
          variant="ghost"
          aria-label="Скачать трек"
          className="h-8 w-8 p-0 rounded-full hover:bg-blue-500/10 hover:text-blue-500 hover:scale-110 active:scale-95 transition-all duration-300"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4" />
        </Button>

        {/* Кнопка поделиться */}
        <Button
          size="sm"
          variant="ghost"
          aria-label="Поделиться треком"
          className="h-8 w-8 p-0 rounded-full hover:bg-green-500/10 hover:text-green-500 hover:scale-110 active:scale-95 transition-all duration-300"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
        </Button>

        {/* Кнопка дополнительных действий */}
        <Button
          size="sm"
          variant="ghost"
          aria-label="Дополнительные действия"
          className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary hover:scale-110 active:scale-95 transition-all duration-300"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Счетчик лайков */}
      {likeCount > 0 && (
        <div className={cn(
          "flex items-center gap-1 text-xs text-muted-foreground transition-all duration-300",
          "opacity-60 group-hover:opacity-100"
        )}>
          <Heart className={cn("h-3 w-3", isLiked && "fill-current text-red-500")} />
          <span>{likeCount}</span>
        </div>
      )}
    </div>
  );
});