import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Heart, Download, Share2, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Track } from "@/services/api.service";

interface TrackCardProps {
  track: Track;
  onPlay?: () => void;
  onLike?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  isLiked?: boolean;
}

const gradients = [
  'from-primary/20 via-accent/20 to-primary/10',
  'from-purple-500/20 via-pink-500/20 to-purple-500/10',
  'from-blue-500/20 via-cyan-500/20 to-blue-500/10',
  'from-green-500/20 via-emerald-500/20 to-green-500/10',
  'from-orange-500/20 via-red-500/20 to-orange-500/10',
];

export const TrackCard = ({ 
  track, 
  onPlay, 
  onLike, 
  onDownload, 
  onShare,
  isLiked = false 
}: TrackCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const gradientIndex = Math.abs(track.id.charCodeAt(0) % gradients.length);
  
  const getStatusBadge = () => {
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
  };

  return (
    <Card 
      className="overflow-hidden hover:border-primary/50 transition-all duration-300 hover-lift"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Art with Gradient */}
      <div className="relative aspect-square overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradients[gradientIndex]}`} />
        
        {/* Play Button Overlay */}
        {track.audio_url && (
          <div 
            className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Button
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={onPlay}
            >
              <Play className="w-8 h-8 fill-current" />
            </Button>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {getStatusBadge()}
        </div>
      </div>

      {/* Track Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{track.title}</h4>
            {track.improved_prompt && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {track.improved_prompt}
              </p>
            )}
          </div>
          
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLike}
            className={isLiked ? "text-red-500" : ""}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          
          {track.audio_url && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </>
          )}
          
          <div className="flex-1" />
          
          {track.duration && (
            <span className="text-xs text-muted-foreground">
              {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
