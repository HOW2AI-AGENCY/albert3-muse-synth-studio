/**
 * Project Selector Dialog with Track Selection
 * Allows selecting a project and optionally choosing tracks from it
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Folder, Music, Plus, Check } from 'lucide-react';
import { useProjects } from '@/contexts/project/useProjects';
import { useTracks } from '@/hooks/useTracks';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { cn } from '@/lib/utils';

interface ProjectSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onTrackSelect?: (track: {
    id: string;
    title: string;
    prompt?: string;
    lyrics?: string;
    style_tags?: string[];
  }) => void;
  showTrackSelection?: boolean;
}

export const ProjectSelectorDialog: React.FC<ProjectSelectorDialogProps> = ({
  open,
  onOpenChange,
  selectedProjectId,
  onProjectSelect,
  onTrackSelect,
  showTrackSelection = true,
}) => {
  const { projects, isLoading } = useProjects();
  const { tracks: allTracks } = useTracks();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'select' | 'create'>('select');

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.genre?.toLowerCase().includes(query) ||
      p.mood?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // Get tracks for selected project (check both project_id field and project_tracks junction table)
  const projectTracks = useMemo(() => {
    if (!selectedProjectId) return [];
    
    // Filter tracks that are either:
    // 1. Directly assigned via project_id field
    // 2. Linked through project_tracks junction table
    const directTracks = allTracks.filter(
      t => t.project_id === selectedProjectId && t.status === 'completed'
    );
    
    // For now, return direct tracks. Junction table support will be added when needed.
    // TODO: Query project_tracks table to get additional linked tracks
    return directTracks;
  }, [allTracks, selectedProjectId]);

  const handleProjectClick = (projectId: string) => {
    onProjectSelect(projectId);
    if (!showTrackSelection) {
      onOpenChange(false);
    }
  };

  const handleTrackClick = (track: typeof projectTracks[0]) => {
    if (onTrackSelect) {
      // ✅ Pass full track data for auto-fill
      onTrackSelect({
        id: track.id,
        title: track.title,
        prompt: track.prompt || undefined,
        lyrics: track.lyrics || undefined,
        style_tags: track.style_tags || undefined,
      });
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Выбор проекта</DialogTitle>
            <DialogDescription>
              Выберите проект {showTrackSelection && 'и трек из него'} для генерации
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">
                <Folder className="h-4 w-4 mr-2" />
                Выбрать проект
              </TabsTrigger>
              <TabsTrigger value="create">
                <Plus className="h-4 w-4 mr-2" />
                Создать новый
              </TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="space-y-4 mt-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск проектов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Projects List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Проекты</h3>
                  <ScrollArea className="h-[300px] sm:h-[400px] pr-4">
                    {isLoading ? (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        Загрузка...
                      </div>
                    ) : filteredProjects.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        {searchQuery ? 'Проекты не найдены' : 'Нет проектов'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredProjects.map((project) => (
                          <Button
                            key={project.id}
                            variant="outline"
                            className={cn(
                              "w-full justify-start h-auto p-3",
                              selectedProjectId === project.id && "border-primary bg-primary/5"
                            )}
                            onClick={() => handleProjectClick(project.id)}
                          >
                            <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 w-full">
                                <span className="font-medium truncate">{project.name}</span>
                                {selectedProjectId === project.id && (
                                  <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {project.genre && <Badge variant="secondary" className="text-[10px]">{project.genre}</Badge>}
                                {project.mood && <Badge variant="secondary" className="text-[10px]">{project.mood}</Badge>}
                              </div>
                              {(project.total_tracks ?? 0) > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {project.completed_tracks ?? 0}/{project.total_tracks ?? 0} треков
                                </span>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Tracks from Selected Project */}
                {showTrackSelection && selectedProjectId && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                      Треки проекта "{selectedProject?.name}"
                    </h3>
                    <ScrollArea className="h-[300px] sm:h-[400px] pr-4">
                      {projectTracks.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          В проекте пока нет завершенных треков
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projectTracks.map((track) => (
                            <Button
                              key={track.id}
                              variant="outline"
                              className="w-full justify-start h-auto p-3"
                              onClick={() => handleTrackClick(track)}
                            >
                              <div className="flex items-center gap-3 w-full">
                                {track.cover_url && (
                                  <img 
                                    src={track.cover_url} 
                                    alt={track.title}
                                    className="w-10 h-10 rounded object-cover"
                                    loading="lazy" decoding="async"
                                  />
                                )}
                                <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                                  <span className="font-medium truncate w-full">{track.title}</span>
                                  <div className="flex items-center gap-2">
                                    {track.style_tags && track.style_tags.length > 0 && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        {track.style_tags[0]}
                                      </Badge>
                                    )}
                                    {track.duration && (
                                      <span className="text-xs text-muted-foreground">
                                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Music className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onProjectSelect(null);
                    onOpenChange(false);
                  }}
                  className="gap-2"
                >
                  Без проекта
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Отмена
                  </Button>
                  <Button onClick={() => onOpenChange(false)} disabled={!selectedProjectId}>
                    Выбрать
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="create" className="mt-4">
              <div className="text-center py-8">
                <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать проект
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreateProjectDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
};
