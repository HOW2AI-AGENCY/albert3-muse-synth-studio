/**
 * Audio Card Component
 * Sprint 30: Lyrics & Audio Management - Phase 2
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Play, Music, MoreVertical, Download } from 'lucide-react';
import { AudioLibraryItem, useAudioLibrary } from '@/hooks/useAudioLibrary';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AudioCardProps {
  audio: AudioLibraryItem;
  isSelected?: boolean;
  onClick?: () => void;
}

export const AudioCard = React.memo<AudioCardProps>(({ audio, isSelected, onClick }) => {
  const { toggleFavorite, deleteAudio } = useAudioLibrary();

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate({ id: audio.id, isFavorite: audio.is_favorite });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить это аудио?')) {
      deleteAudio.mutate(audio.id);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(audio.file_url, '_blank');
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '--';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'upload': return 'Загружено';
      case 'recording': return 'Запись';
      case 'generated': return 'Сгенерировано';
      default: return type;
    }
  };

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium line-clamp-1">{audio.file_name}</h3>
            <p className="text-xs text-muted-foreground">
              {getSourceTypeLabel(audio.source_type)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleFavorite}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  audio.is_favorite && "fill-yellow-400 text-yellow-400"
                )}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Скачать
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Audio visualization placeholder */}
        <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
          <Music className="h-12 w-12 text-muted-foreground" />
        </div>

        {/* Description */}
        {audio.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {audio.description}
          </p>
        )}

        {/* Tags */}
        {audio.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {audio.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {audio.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{audio.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{formatDuration(audio.duration_seconds)}</span>
            <span>•</span>
            <span>{formatFileSize(audio.file_size)}</span>
          </div>
          {audio.usage_count > 0 && (
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {audio.usage_count}x
            </span>
          )}
        </div>
      </div>
    </Card>
  );
});

AudioCard.displayName = 'AudioCard';
