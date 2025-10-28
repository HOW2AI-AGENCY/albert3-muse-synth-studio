/**
 * Lyrics Card Component
 * Sprint 31 - Week 2: Refactored with shared components
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Music } from 'lucide-react';
import { SavedLyrics, useSavedLyrics } from '@/hooks/useSavedLyrics';
import { cn } from '@/lib/utils';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import { CardActionsMenu, type CardAction } from '@/components/shared/CardActionsMenu';
import { useCardActions } from '@/hooks/useCardActions';

interface LyricsCardProps {
  lyrics: SavedLyrics;
  isSelected?: boolean;
  onClick?: () => void;
}

export const LyricsCard = React.memo<LyricsCardProps>(({ lyrics, isSelected, onClick }) => {
  const { toggleFavorite, deleteLyrics } = useSavedLyrics();

  const preview = React.useMemo(() => {
    const lines = lyrics.content.split('\n').filter(l => l.trim());
    return lines.slice(0, 4).join('\n');
  }, [lyrics.content]);

  const { handleToggleFavorite, handleCopy, handleDelete } = useCardActions({
    onToggleFavorite: (id, isFavorite) => toggleFavorite.mutate({ id, isFavorite }),
    onDelete: (id) => deleteLyrics.mutate(id),
    deleteConfirmMessage: 'Удалить эту лирику?',
  });

  const actions: CardAction[] = [
    {
      label: 'Копировать',
      icon: <Copy className="h-4 w-4" />,
      onClick: (e) => handleCopy(e, lyrics.content),
    },
    {
      label: 'Удалить',
      onClick: (e) => handleDelete(e, lyrics.id),
      variant: 'destructive',
    },
  ];

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
          <h3 className="font-medium line-clamp-1">{lyrics.title}</h3>
          <div className="flex items-center gap-1">
            <FavoriteButton
              isFavorite={lyrics.is_favorite}
              onClick={(e) => handleToggleFavorite(e, lyrics.id, lyrics.is_favorite)}
            />
            <CardActionsMenu actions={actions} />
          </div>
        </div>

        {/* Preview */}
        <div className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
          {preview}
        </div>

        {/* Tags */}
        {lyrics.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lyrics.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {lyrics.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{lyrics.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {lyrics.usage_count > 0 && (
              <span className="flex items-center gap-1">
                <Music className="h-3 w-3" />
                {lyrics.usage_count}x
              </span>
            )}
          </div>
          <span>{new Date(lyrics.created_at).toLocaleDateString('ru')}</span>
        </div>
      </div>
    </Card>
  );
});

LyricsCard.displayName = 'LyricsCard';
