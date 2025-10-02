import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Heart, Download, Share2, MoreVertical, Music4 } from "lucide-react";
import { useState, useMemo, useCallback, memo } from "react";
import { Track } from "@/services/api.service";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useTrackLike } from "@/hooks/useTrackLike";

interface TrackCardProps {
  track: Track;
  onDownload?: () => void;
  onShare?: () => void;
  isSelected?: boolean;
  onClick?: () => void;
}

const gradients = [
  'from-primary/20 via-accent/20 to-primary/10',
  'from-purple-500/20 via-pink-500/20 to-purple-500/10',
  'from-blue-500/20 via-cyan-500/20 to-blue-500/10',
  'from-green-500/20 via-emerald-500/20 to-green-500/10',
  'from-orange-500/20 via-red-500/20 to-orange-500/10',
];

const TrackCardComponent = ({ 
  track, 
  onDownload, 
  onShare,
  isSelected = false,
  onClick
}: TrackCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  
  // Мемоизируем тяжелые вычисления
  const gradientIndex = useMemo(() => 
    Math.abs(track.id.charCodeAt(0) % gradients.length), 
    [track.id]
  );
  
  const isCurrentTrack = useMemo(() => 
    currentTrack?.id === track.id, 
    [currentTrack?.id, track.id]
  );
  
  const showPlayButton = useMemo(() => 
    track.audio_url && track.status === 'completed', 
    [track.audio_url, track.status]
  );

  // Мемоизируем обработчики событий
  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike();
  }, [toggleLike]);
  
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
  }, [isCurrentTrack, isPlaying, togglePlayPause, playTrack, track]);

  const formattedDuration = useMemo(() => {
    if (!track.duration) return null;
    return `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`;
  }, [track.duration]);

  return (
    <Card 
      className={`overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isCurrentTrack ? "ring-2 ring-accent" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Cover Art */}
      <div className="relative aspect-square overflow-hidden">
        {track.cover_url ? (
          <img 
            src={track.cover_url} 
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradients[gradientIndex]}`} />
        )}
        
        {/* Play Button Overlay */}
        {showPlayButton && (
          <div 
            className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
              isHovered || isCurrentTrack ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Button
              size="lg"
              className="rounded-full w-14 h-14 shadow-xl"
              onClick={handlePlayClick}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current" />
              )}
            </Button>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          {track.has_stems && (
            <Badge variant="secondary" className="gap-1 text-xs px-1.5 py-0.5">
              <Music4 className="w-3 h-3" />
            </Badge>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {/* Track Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{track.title}</h4>
            
            {/* Style Tags - max 2 */}
            {track.style_tags && track.style_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {track.style_tags.slice(0, 2).map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
                {track.style_tags.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    +{track.style_tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${isLiked ? "text-red-500" : ""}`}
            onClick={handleLikeClick}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          {likeCount > 0 && (
            <span className="text-xs text-muted-foreground">{likeCount}</span>
          )}
          
          {track.audio_url && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onDownload}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onShare}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          
          <div className="flex-1" />
          
          {track.duration && (
            <span className="text-xs text-muted-foreground">
              {formattedDuration}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

// Экспортируем мемоизированный компонент
export const TrackCard = memo(TrackCardComponent);
