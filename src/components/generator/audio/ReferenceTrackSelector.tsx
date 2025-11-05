import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Music, X } from '@/utils/iconImports';
import { useTracks } from '@/hooks/useTracks';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ReferenceTrackSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (track: { id: string; audio_url: string; title: string }) => void;
}

export const ReferenceTrackSelector = ({
  open,
  onClose,
  onSelect,
}: ReferenceTrackSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { tracks, isLoading } = useTracks();

  // Фильтруем только completed треки с audio_url
  const availableTracks = useMemo(() => {
    return tracks.filter(
      (track) =>
        track.status === 'completed' &&
        track.audio_url &&
        track.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tracks, searchQuery]);

  const handleSelectTrack = (track: typeof availableTracks[0]) => {
    onSelect({
      id: track.id,
      audio_url: track.audio_url!,
      title: track.title,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Выбрать трек из библиотеки</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск треков..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Список треков */}
          <ScrollArea className="h-[300px] sm:h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Загрузка треков...</p>
              </div>
            ) : availableTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Music className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Треки не найдены' : 'Нет доступных треков'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleSelectTrack(track)}
                    className={cn(
                      'w-full p-3 rounded-lg border transition-colors text-left',
                      'hover:bg-secondary/50 hover:border-primary/30',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Обложка */}
                      {track.cover_url ? (
                        <img
                          src={track.cover_url}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Информация */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{track.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {track.style_tags && track.style_tags.length > 0 && (
                            <span className="truncate">{track.style_tags.slice(0, 2).join(', ')}</span>
                          )}
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(track.created_at), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </span>
                        </div>
                        {track.duration_seconds && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.floor(track.duration_seconds / 60)}:
                            {String(track.duration_seconds % 60).padStart(2, '0')}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
