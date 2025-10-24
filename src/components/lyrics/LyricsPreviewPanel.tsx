/**
 * Lyrics Preview Panel Component
 * Sprint 30: Lyrics & Audio Management
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Copy, Music, Star } from 'lucide-react';
import { SavedLyrics, useSavedLyrics } from '@/hooks/useSavedLyrics';

interface LyricsPreviewPanelProps {
  lyrics: SavedLyrics;
  onClose: () => void;
}

export const LyricsPreviewPanel = React.memo<LyricsPreviewPanelProps>(({ 
  lyrics, 
  onClose 
}) => {
  const { toggleFavorite } = useSavedLyrics();

  const handleCopy = () => {
    navigator.clipboard.writeText(lyrics.content);
  };

  const handleToggleFavorite = () => {
    toggleFavorite.mutate({ id: lyrics.id, isFavorite: lyrics.is_favorite });
  };

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold line-clamp-2">{lyrics.title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Lyrics content */}
          <div className="prose prose-sm dark:prose-invert whitespace-pre-line">
            {lyrics.content}
          </div>

          {/* Metadata */}
          {lyrics.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Теги</p>
              <div className="flex flex-wrap gap-2">
                {lyrics.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(lyrics.genre || lyrics.mood) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Стиль</p>
              <div className="flex gap-2">
                {lyrics.genre && (
                  <Badge variant="outline">{lyrics.genre}</Badge>
                )}
                {lyrics.mood && (
                  <Badge variant="outline">{lyrics.mood}</Badge>
                )}
              </div>
            </div>
          )}

          {lyrics.prompt && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Промпт</p>
              <p className="text-sm text-muted-foreground">{lyrics.prompt}</p>
            </div>
          )}

          {/* Usage stats */}
          {lyrics.usage_count > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Использование</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Music className="h-4 w-4" />
                Использовано {lyrics.usage_count} раз
              </div>
              {lyrics.last_used_at && (
                <p className="text-xs text-muted-foreground">
                  Последний раз: {new Date(lyrics.last_used_at).toLocaleString('ru')}
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="default"
          className="w-full"
          onClick={handleCopy}
        >
          <Copy className="mr-2 h-4 w-4" />
          Копировать
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleToggleFavorite}
        >
          <Star className={lyrics.is_favorite ? "mr-2 h-4 w-4 fill-current" : "mr-2 h-4 w-4"} />
          {lyrics.is_favorite ? 'Удалить из избранного' : 'В избранное'}
        </Button>
      </div>
    </div>
  );
});

LyricsPreviewPanel.displayName = 'LyricsPreviewPanel';