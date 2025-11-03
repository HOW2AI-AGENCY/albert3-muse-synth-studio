/**
 * Project Track Picker Dialog
 * Выбор трека из треклиста проекта с автозаполнением формы
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Search, Clock, Check, User } from 'lucide-react';
import { useTracks } from '@/hooks/useTracks';
import { useProjects } from '@/contexts/ProjectContext';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import type { Track } from '@/types/domain/track.types';

interface ProjectTrackPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTrackSelect: (track: Track) => void;
  selectedTrackId?: string | null;
}

export const ProjectTrackPickerDialog = ({
  open,
  onOpenChange,
  projectId,
  onTrackSelect,
  selectedTrackId,
}: ProjectTrackPickerDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { tracks: allTracks } = useTracks();
  const { projects } = useProjects();

  const currentProject = projects.find(p => p.id === projectId);

  // Получаем треки проекта (включая черновики и завершенные)
  const projectTracks = useMemo(() => {
    return allTracks.filter(
      track => track.project_id === projectId
    ).sort((a, b) => {
      // Сортируем по дате создания (новые первыми)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [allTracks, projectId]);

  // Фильтруем треки по поисковому запросу
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return projectTracks;

    const query = searchQuery.toLowerCase();
    return projectTracks.filter(track => 
      track.title.toLowerCase().includes(query) ||
      track.style_tags?.some(tag => tag.toLowerCase().includes(query)) ||
      track.genre?.toLowerCase().includes(query) ||
      track.prompt?.toLowerCase().includes(query)
    );
  }, [projectTracks, searchQuery]);

  const handleTrackClick = useCallback((track: Track) => {
    logger.info('Track selected from project', 'ProjectTrackPickerDialog', {
      trackId: track.id,
      trackTitle: track.title,
      projectId,
    });

    onTrackSelect(track);
    onOpenChange(false);
  }, [onTrackSelect, onOpenChange, projectId]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="text-xs">Готов</Badge>;
      case 'processing':
        return <Badge variant="default" className="text-xs animate-pulse">В процессе</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-xs">Ожидает</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Ошибка</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Выбрать трек из проекта
          </DialogTitle>
          <DialogDescription>
            {currentProject?.name && (
              <div className="flex items-center gap-2 mt-1">
                <span className="font-medium text-foreground">{currentProject.name}</span>
                {currentProject.persona_id && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <User className="h-3 w-3" />
                    Персона привязана
                  </Badge>
                )}
              </div>
            )}
            Выберите трек для автозаполнения формы генерации
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, тегам, жанру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tracks List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Треки не найдены' : 'В проекте пока нет треков'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-muted-foreground mt-2">
                  Создайте первый трек для этого проекта
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredTracks.map((track) => {
                const isSelected = selectedTrackId === track.id;
                
                return (
                  <button
                    key={track.id}
                    onClick={() => handleTrackClick(track)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      "hover:border-primary hover:bg-accent/50",
                      isSelected && "border-primary bg-accent/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Cover */}
                      {track.cover_url ? (
                        <img
                          src={track.cover_url}
                          alt={track.title}
                          className="w-16 h-16 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-accent flex items-center justify-center flex-shrink-0">
                          <Music className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>

                        {/* Style Tags */}
                        {track.style_tags && track.style_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {track.style_tags.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {track.style_tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                +{track.style_tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {getStatusBadge(track.status)}
                          
                          {track.duration_seconds && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(track.duration_seconds)}
                            </div>
                          )}

                          {track.genre && (
                            <span className="truncate">{track.genre}</span>
                          )}

                          {track.has_vocals !== null && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {track.has_vocals ? 'Вокал' : 'Инстр.'}
                            </Badge>
                          )}
                        </div>

                        {/* Prompt Preview */}
                        {track.prompt && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {track.prompt}
                          </p>
                        )}

                        {/* Lyrics indicator */}
                        {track.lyrics && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-2">
                            📝 Текст доступен
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Найдено треков: {filteredTracks.length} из {projectTracks.length}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
