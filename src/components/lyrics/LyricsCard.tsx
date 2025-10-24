/**
 * Lyrics Card Component
 * Sprint 30: Lyrics & Audio Management
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Copy, Music, MoreVertical } from 'lucide-react';
import { SavedLyrics, useSavedLyrics } from '@/hooks/useSavedLyrics';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate({ id: lyrics.id, isFavorite: lyrics.is_favorite });
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(lyrics.content);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить эту лирику?')) {
      deleteLyrics.mutate(lyrics.id);
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
          <h3 className="font-medium line-clamp-1">{lyrics.title}</h3>
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
                  lyrics.is_favorite && "fill-yellow-400 text-yellow-400"
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
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Копировать
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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