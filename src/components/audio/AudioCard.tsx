/**
 * Audio Card Component
 * Sprint 31 - Week 2: Refactored with shared components
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Music, Download } from 'lucide-react';
import { AudioLibraryItem, useAudioLibrary } from '@/hooks/useAudioLibrary';
import { cn } from '@/lib/utils';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import { CardActionsMenu, type CardAction } from '@/components/shared/CardActionsMenu';
import { useCardActions } from '@/hooks/useCardActions';

interface AudioCardProps {
  audio: AudioLibraryItem;
  isSelected?: boolean;
  onClick?: () => void;
}

export const AudioCard = React.memo<AudioCardProps>(({ audio, isSelected, onClick }) => {
  const { toggleFavorite, deleteAudio } = useAudioLibrary();

  const { handleToggleFavorite, handleDelete, handleDownload } = useCardActions({
    onToggleFavorite: (id, isFavorite) => toggleFavorite.mutate({ id, isFavorite }),
    onDelete: (id) => deleteAudio.mutate(id),
    deleteConfirmMessage: 'Удалить это аудио?',
  });

  const actions: CardAction[] = [
    {
      label: 'Скачать',
      icon: <Download className="h-4 w-4" />,
      onClick: (e) => handleDownload(e, audio.file_url, audio.file_name),
    },
    {
      label: 'Удалить',
      onClick: (e) => handleDelete(e, audio.id),
      variant: 'destructive',
    },
  ];

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
            <FavoriteButton
              isFavorite={audio.is_favorite}
              onClick={(e) => handleToggleFavorite(e, audio.id, audio.is_favorite)}
            />
            <CardActionsMenu actions={actions} />
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
