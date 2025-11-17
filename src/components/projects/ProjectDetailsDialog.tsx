/**
 * Project Details Dialog - Mobile Optimized
 */

import React, { useMemo, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from '@/components/ui/responsive-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Music, Clock, Disc3, Sparkles } from '@/utils/iconImports';
import { useTracks } from '@/hooks/useTracks';
import { useGenerateProjectTracklist } from '@/hooks/useGenerateProjectTracklist';
import { TrackActions } from '@/components/projects/TrackActions';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useProjects } from '@/contexts/project/useProjects';

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
  const { updateProject } = useProjects();
  const { tracks: allTracks, isLoading } = useTracks(undefined, { 
    projectId: project?.id 
  });
  const { generateTracklist, isGenerating } = useGenerateProjectTracklist();

  const [isPublic, setIsPublic] = useState<boolean>(!!project?.is_public);
  useEffect(() => {
    setIsPublic(!!project?.is_public);
  }, [project?.is_public]);

  const projectTracks = useMemo(() => {
    return allTracks.sort((a, b) => {
      const orderA = (a.metadata as any)?.planned_order ?? 999;
      const orderB = (b.metadata as any)?.planned_order ?? 999;
      return orderA - orderB;
    });
  }, [allTracks]);

  const completedTracks = useMemo(() => {
    return projectTracks.filter(track => track.status === 'completed');
  }, [projectTracks]);

  const draftTracks = useMemo(() => {
    return projectTracks.filter(track => 
      track.status !== 'completed' && track.status !== 'failed'
    );
  }, [projectTracks]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!project) return null;

  const completionPercent = project.total_tracks && project.total_tracks > 0
    ? Math.round((project.completed_tracks || 0) / project.total_tracks * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "w-[calc(100vw-2rem)] lg:w-[calc(100vw-4rem)]",
        "max-w-[1200px] h-[85vh] max-h-[800px]",
        "p-0 flex flex-col"
      )}>
        <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl">{project.name}</DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Публичный</span>
              <Switch
                checked={isPublic}
                onCheckedChange={async (checked) => {
                  setIsPublic(checked);
                  if (project) {
                    await updateProject(project.id, { is_public: checked } as any);
                  }
                }}
              />
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6">
          <div className="space-y-3 pb-4">
            <Card className="p-3 bg-muted/50">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Прогресс</span>
                  <span className="font-medium">{completionPercent}%</span>
                </div>
                <Progress value={completionPercent} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{completedTracks.length} готово</span>
                  <span>{draftTracks.length} в работе</span>
                  <span>{project.total_tracks || 0} всего</span>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Card className="p-2.5">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Disc3 className="h-3.5 w-3.5" />
                    <span className="text-xs">Треки</span>
                  </div>
                  <span className="text-lg font-bold">{projectTracks.length}</span>
                </div>
              </Card>

              <Card className="p-2.5">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs">Время</span>
                  </div>
                  <span className="text-lg font-bold">
                    {Math.floor((project.total_duration || 0) / 60)}м
                  </span>
                </div>
              </Card>

              <Card className="p-2.5">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Music className="h-3.5 w-3.5" />
                    <span className="text-xs">Жанр</span>
                  </div>
                  <span className="text-xs font-medium truncate">
                    {project.genre || '—'}
                  </span>
                </div>
              </Card>

              <Card className="p-2.5">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Music className="h-3.5 w-3.5" />
                    <span className="text-xs">Mood</span>
                  </div>
                  <span className="text-xs font-medium truncate">
                    {project.mood || '—'}
                  </span>
                </div>
              </Card>
            </div>

            {(project.concept_description || project.description) && (
              <Accordion type="single" collapsible>
                <AccordionItem value="desc">
                  <AccordionTrigger className="text-sm py-2">
                    {project.concept_description ? 'Концепция' : 'Описание'}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {project.concept_description || project.description}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <div className="flex items-center justify-between pt-2">
              <h3 className="text-sm font-semibold">Треки</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => project && generateTracklist(project)}
                disabled={isGenerating}
              >
                {isGenerating ? 'Генерация...' : <><Sparkles className="h-4 w-4 mr-2" />AI</>}
              </Button>
            </div>

            {projectTracks.length === 0 ? (
              <Card className="p-6 text-center">
                <Music className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Треки еще не добавлены</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {projectTracks.map((track) => (
                  <Card key={track.id} className="p-3">
                    <div className="flex gap-3">
                      {track.cover_url ? (
                        <img src={track.cover_url} alt={track.title} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{track.title}</h4>
                          <Badge variant={track.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {track.status === 'completed' ? 'Готов' : 'Черновик'}
                          </Badge>
                        </div>
                        {track.prompt && <p className="text-xs text-muted-foreground line-clamp-2">{track.prompt}</p>}
                        <TrackActions
                          track={track}
                          projectId={project.id}
                          projectName={project.name}
                          projectDescription={project.description}
                          projectGenre={project.genre}
                          projectMood={project.mood}
                          onLyricsGenerated={() => queryClient.invalidateQueries({ queryKey: ['tracks'] })}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
