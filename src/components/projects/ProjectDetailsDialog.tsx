/**
 * Project Details Dialog
 * Shows project information and tracklist
 */

import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Music, Clock, Disc3, Tag, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { useTracks } from '@/hooks/useTracks';
import { useGenerateProjectTracklist } from '@/hooks/useGenerateProjectTracklist';
import { TrackActions } from '@/components/projects/TrackActions';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type MusicProject = Database['public']['Tables']['music_projects']['Row'];

interface ProjectDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: MusicProject | null;
}

export const ProjectDetailsDialog: React.FC<ProjectDetailsDialogProps> = ({
  open,
  onOpenChange,
  project,
}) => {
  const queryClient = useQueryClient();
  const { tracks: allTracks, isLoading } = useTracks(undefined, { 
    projectId: project?.id 
  });
  const { generateTracklist, isGenerating } = useGenerateProjectTracklist();

  // Треки уже отфильтрованы по project_id через хук
  const projectTracks = useMemo(() => {
    return allTracks.sort((a, b) => {
      // Sort by planned_order if exists, otherwise by created_at
      const orderA = (a.metadata as any)?.planned_order ?? 999;
      const orderB = (b.metadata as any)?.planned_order ?? 999;
      return orderA - orderB;
    });
  }, [allTracks]);

  const completedTracks = useMemo(() => {
    return projectTracks.filter(track => track.status === 'completed');
  }, [projectTracks]);

  const draftTracks = useMemo(() => {
    // Count tracks that are not completed or failed
    return projectTracks.filter(track => 
      track.status !== 'completed' && track.status !== 'failed'
    );
  }, [projectTracks]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!project) return null;

  const completionPercent = project.total_tracks && project.total_tracks > 0
    ? Math.round((project.completed_tracks || 0) / project.total_tracks * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl">{project.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="px-6 pb-6 space-y-6">
            {/* Cover and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cover Image */}
              <div className="md:col-span-1">
                {project.cover_url ? (
                  <img
                    src={project.cover_url}
                    alt={project.name}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-primary/20 via-primary/10 to-background rounded-lg flex items-center justify-center">
                    <Music className="h-24 w-24 text-primary/30" />
                  </div>
                )}
              </div>

              {/* Project Info */}
              <div className="md:col-span-2 space-y-4">
                {/* Type and Stats */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary" className="text-sm">
                    {project.project_type || 'single'}
                  </Badge>
                  {project.genre && (
                    <Badge variant="outline" className="text-sm">
                      {project.genre}
                    </Badge>
                  )}
                  {project.mood && (
                    <Badge variant="outline" className="text-sm">
                      {project.mood}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {project.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Описание</h3>
                    <p className="text-sm leading-relaxed">{project.description}</p>
                  </div>
                )}

                {/* Concept */}
                {project.concept_description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Концепция</h3>
                    <p className="text-sm leading-relaxed">{project.concept_description}</p>
                  </div>
                )}

                {/* Story Theme */}
                {project.story_theme && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Тематика</h3>
                    <p className="text-sm leading-relaxed">{project.story_theme}</p>
                  </div>
                )}

                {/* Style Tags */}
                {project.style_tags && project.style_tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Стили
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {project.style_tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Disc3 className="h-4 w-4" />
                      <span className="text-xs">Треки</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {project.completed_tracks || 0}/{project.total_tracks || 0}
                    </p>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Длительность</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {project.total_duration ? formatDuration(project.total_duration) : '0:00'}
                    </p>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">Прогресс</span>
                    </div>
                    <p className="text-2xl font-bold">{completionPercent}%</p>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs">Создан</span>
                    </div>
                    <p className="text-xs font-medium">
                      {formatDate(project.created_at!)}
                    </p>
                  </Card>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tracklist */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Треки проекта
                </h3>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await generateTracklist({
                              id: project.id,
                              name: project.name,
                              description: project.description,
                              genre: project.genre,
                              mood: project.mood,
                              project_type: project.project_type,
                              total_tracks: project.total_tracks,
                            });
                          }}
                          disabled={isGenerating}
                        >
                          <Sparkles className={cn("h-4 w-4", isGenerating && "animate-pulse")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Сгенерировать треклист</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {completedTracks.length} завершено
                    </Badge>
                    {draftTracks.length > 0 && (
                      <Badge variant="outline">
                        {draftTracks.length} черновиков
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Загрузка треков...
                </div>
              ) : projectTracks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>В проекте пока нет треков</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectTracks.map((track, index) => (
                    <Card
                      key={track.id}
                      className={cn(
                        "p-4 hover:bg-accent/50 transition-colors",
                        track.status !== 'completed' && "opacity-60"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Track Number */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>

                        {/* Cover */}
                        <div className="flex-shrink-0">
                          {track.cover_url ? (
                            <img
                              src={track.cover_url}
                              alt={track.title}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <Music className="h-6 w-6 text-primary/50" />
                            </div>
                          )}
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{track.title}</h4>
                              {track.prompt && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                  {track.prompt}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={
                                track.status === 'completed' ? 'default' : 
                                track.lyrics ? 'default' : 'secondary'
                              }
                              className={cn(
                                "text-xs flex-shrink-0 transition-all",
                                track.lyrics && track.status !== 'completed' && "animate-pulse"
                              )}
                            >
                              {track.status === 'completed' ? 'Готов' : 
                               track.status === 'processing' ? 'Обработка' : 
                               track.lyrics ? 'Черновик' :
                               track.status === 'pending' ? 'В очереди' : 
                               track.status === 'failed' ? 'Ошибка' : 'В очереди'}
                            </Badge>
                          </div>

                          {/* Tags and Duration */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {track.style_tags && track.style_tags.slice(0, 3).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                            {track.duration && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(track.duration)}
                              </span>
                            )}
                          </div>

                          {/* Track Actions for non-completed Tracks */}
                          {track.status !== 'completed' && track.status !== 'failed' && (
                            <TrackActions
                              track={track as any}
                              projectId={project.id}
                              projectName={project.name}
                              projectDescription={project.concept_description}
                              projectGenre={project.genre}
                              projectMood={project.mood}
                              onLyricsGenerated={() => {
                                queryClient.invalidateQueries({ queryKey: ['tracks'] });
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
