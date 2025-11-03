/**
 * Project Track Picker Dialog
 * Выбор трека из треклиста проекта с автозаполнением формы
 * Полностью переработанный дизайн
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
import { Music, Search, Clock, Check, User, ListMusic, Sparkles } from 'lucide-react';
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
      // Сортируем: сначала готовые, потом по дате
      if (a.status === 'completed' && b.status !== 'completed') return -1;
      if (a.status !== 'completed' && b.status === 'completed') return 1;
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
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        {/* Header with gradient */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-accent/5 to-background border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListMusic className="h-6 w-6 text-primary" />
              </div>
              Треки проекта
            </DialogTitle>
            <DialogDescription className="mt-2">
              {currentProject?.name && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="font-semibold text-foreground text-base">
                    {currentProject.name}
                  </span>
                  {currentProject.genre && (
                    <Badge variant="secondary" className="text-xs">
                      {currentProject.genre}
                    </Badge>
                  )}
                  {currentProject.persona_id && (
                    <Badge variant="outline" className="text-xs gap-1.5 bg-primary/5 border-primary/20">
                      <User className="h-3 w-3" />
                      Персона привязана
                    </Badge>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Выберите трек для автозаполнения полей генерации
              </p>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Search - updated design */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, тегам, жанру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-accent/30 border-accent"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs"
              >
                Очистить
              </Button>
            )}
          </div>
        </div>

        {/* Tracks List - improved design */}
        <ScrollArea className="flex-1 px-6 h-[450px]">
          {filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-accent/50 mb-4">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'Треки не найдены' : 'Пока нет треков'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery 
                  ? 'Попробуйте изменить поисковый запрос' 
                  : 'Создайте первый трек для этого проекта в генераторе'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {filteredTracks.map((track) => {
                const isSelected = selectedTrackId === track.id;
                
                return (
                  <button
                    key={track.id}
                    onClick={() => handleTrackClick(track)}
                    className={cn(
                      "group w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                      "hover:border-primary hover:shadow-lg hover:shadow-primary/10",
                      "hover:-translate-y-0.5",
                      isSelected && "border-primary bg-primary/5 shadow-md shadow-primary/20"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Cover with overlay */}
                      <div className="relative flex-shrink-0">
                        {track.cover_url ? (
                          <img
                            src={track.cover_url}
                            alt={track.title}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <Music className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 rounded-lg bg-primary/20 flex items-center justify-center">
                            <div className="p-1.5 rounded-full bg-primary">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info - enhanced */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base mb-0.5 truncate group-hover:text-primary transition-colors">
                              {track.title}
                            </h4>
                            {track.genre && (
                              <p className="text-xs text-muted-foreground">{track.genre}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(track.status)}
                            {isSelected && (
                              <Badge variant="default" className="text-xs gap-1">
                                <Sparkles className="h-3 w-3" />
                                Выбран
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Style Tags */}
                        {track.style_tags && track.style_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {track.style_tags.slice(0, 4).map((tag, idx) => (
                              <Badge 
                                key={idx} 
                                variant="secondary" 
                                className="text-[10px] px-2 py-0.5 font-medium"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {track.style_tags.length > 4 && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                +{track.style_tags.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          {track.duration_seconds && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="font-medium">{formatDuration(track.duration_seconds)}</span>
                            </div>
                          )}

                          {track.has_vocals !== null && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              {track.has_vocals ? '🎤 Вокал' : '🎹 Инструментал'}
                            </Badge>
                          )}

                          {track.lyrics && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-primary/5">
                              📝 Текст
                            </Badge>
                          )}
                        </div>

                        {/* Prompt Preview */}
                        {track.prompt && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-accent/30 p-2 rounded">
                            {track.prompt}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer - enhanced */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-accent/20">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {filteredTracks.length} {searchQuery && `/ ${projectTracks.length}`}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {filteredTracks.length === 1 ? 'трек' : 'треков'}
            </span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-24">
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
