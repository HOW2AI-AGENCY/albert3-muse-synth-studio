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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Music, Plus, Check, FileText, Clock, FolderOpen } from 'lucide-react';
import { useProjects } from '@/contexts/project/useProjects';
import { useTracks } from '@/hooks/useTracks';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { TrackStatusBadge } from '@/components/tracks/TrackStatusBadge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrackStatus } from '@/components/tracks/track-status.types';

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
  const directTracks = useMemo(() => {
    if (!selectedProjectId) return [] as any[];
    // Include all statuses to mirror Project Details behavior
    const filtered = allTracks.filter((t) => t.project_id === selectedProjectId);
    console.log('[ProjectSelector] directTracks:', { 
      selectedProjectId, 
      allTracksCount: allTracks.length,
      filteredCount: filtered.length,
      sample: filtered[0]?.title 
    });
    return filtered;
  }, [allTracks, selectedProjectId]);

  // Also fetch links from junction table project_tracks -> tracks(*)
  const { data: junctionRows } = useQuery({
    queryKey: ['project-tracks-junction', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      console.log('[ProjectSelector] Fetching junction tracks for project:', selectedProjectId);
      const { data, error } = await supabase
        .from('project_tracks')
        .select(`
          track_id,
          tracks:track_id (
            id,
            title,
            prompt,
            lyrics,
            style_tags,
            genre,
            mood,
            status,
            cover_url,
            audio_url,
            duration_seconds,
            created_at,
            provider
          )
        `)
        .eq('project_id', selectedProjectId!);
      if (error) {
        console.error('[ProjectSelector] Junction query error:', error);
        throw error;
      }
      console.log('[ProjectSelector] Junction rows fetched:', data?.length || 0, data?.[0]);
      return data || [];
    },
  });

  const projectTracks = useMemo(() => {
    if (!selectedProjectId) return [] as any[];
    const linked = (junctionRows || [])
      .map((r: any) => r.tracks)
      .filter(Boolean);
    const combined = [...directTracks, ...linked];
    console.log('[ProjectSelector] projectTracks computed:', {
      directCount: directTracks.length,
      linkedCount: linked.length,
      combinedCount: combined.length
    });
    // Dedupe by id and sort by created_at desc if available
    const byId = new Map<string, any>();
    for (const t of combined) {
      if (t && t.id && !byId.has(t.id)) byId.set(t.id, t);
    }
    const result = Array.from(byId.values()).sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
    console.log('[ProjectSelector] Final projectTracks:', result.length);
    return result;
  }, [selectedProjectId, directTracks, junctionRows]);

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
        <DialogContent className="w-[calc(100vw-1rem)] h-[calc(100vh-1rem)] sm:w-[calc(100vw-2rem)] sm:h-auto sm:max-w-4xl sm:max-h-[85vh] p-4 sm:p-6 flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg sm:text-xl">Выбор проекта</DialogTitle>
            <DialogDescription className="text-sm">
              Выберите проект {showTrackSelection && 'и трек из него'} для генерации
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="select" className="text-xs sm:text-sm">
                <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Выбрать
              </TabsTrigger>
              <TabsTrigger value="create" className="text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Создать
              </TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="space-y-3 mt-3 flex-1 flex flex-col min-h-0">
              {/* Search */}
              <div className="relative shrink-0">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск проектов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
                {/* Projects List */}
                <div className="space-y-2 flex flex-col min-h-0">
                  <h3 className="text-xs sm:text-sm font-medium shrink-0">Проекты</h3>
                  <ScrollArea className="h-[calc(50vh-180px)] sm:h-[350px] pr-2 sm:pr-4">
                    {isLoading ? (
                      <div className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
                        Загрузка...
                      </div>
                    ) : filteredProjects.length === 0 ? (
                      <div className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
                        {searchQuery ? 'Проекты не найдены' : 'Нет проектов'}
                      </div>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        {filteredProjects.map((project) => (
                          <Card
                            key={project.id}
                            className={cn(
                              "cursor-pointer hover:border-primary/50 transition-all",
                              selectedProjectId === project.id && "border-primary bg-primary/5 shadow-sm"
                            )}
                            onClick={() => handleProjectClick(project.id)}
                          >
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex flex-col gap-2 sm:gap-3">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-semibold text-sm sm:text-base leading-tight break-words flex-1">
                                    {project.name}
                                  </h4>
                                  {selectedProjectId === project.id && (
                                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
                                  )}
                                </div>
                                
                                {project.description && (
                                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words whitespace-normal line-clamp-3 sm:line-clamp-none">
                                    {project.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  {project.genre && (
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                      {project.genre}
                                    </Badge>
                                  )}
                                  {project.mood && (
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                      {project.mood}
                                    </Badge>
                                  )}
                                  {(project.total_tracks ?? 0) > 0 && (
                                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                                      {project.completed_tracks ?? 0}/{project.total_tracks ?? 0} треков
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Tracks from Selected Project */}
                {showTrackSelection && selectedProjectId && (
                  <div className="space-y-2 flex flex-col min-h-0">
                    <h3 className="text-xs sm:text-sm font-medium shrink-0">
                      Треки: "{selectedProject?.name}"
                    </h3>
                    <ScrollArea className="h-[calc(50vh-180px)] sm:h-[350px] pr-2 sm:pr-4">
                      {projectTracks.length === 0 ? (
                        <div className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
                          В проекте пока нет треков
                        </div>
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          {projectTracks.map((track) => (
                            <Card
                              key={track.id}
                              className="cursor-pointer hover:border-primary/50 transition-all"
                              onClick={() => handleTrackClick(track)}
                            >
                              <CardContent className="p-3 sm:p-4">
                                <div className="flex items-start gap-2 sm:gap-3">
                                  {track.cover_url && (
                                    <img 
                                      src={track.cover_url} 
                                      alt={track.title}
                                      className="w-10 h-10 sm:w-14 sm:h-14 rounded object-cover flex-shrink-0"
                                      loading="lazy" decoding="async"
                                    />
                                  )}
                                  <div className="flex flex-col gap-1.5 sm:gap-2.5 flex-1 min-w-0">
                                    <div className="flex items-start gap-1.5 sm:gap-2">
                                      <h4 className="font-semibold text-xs sm:text-sm leading-tight break-words whitespace-normal flex-1">
                                        {track.title}
                                      </h4>
                                      {track.lyrics && (
                                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                    
                                    {track.prompt && (
                                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed break-words whitespace-normal line-clamp-2">
                                        {track.prompt}
                                      </p>
                                    )}
                                    
                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                      <TrackStatusBadge 
                                        status={track.status as TrackStatus}
                                        variant="compact"
                                        showIcon={true}
                                      />
                                      
                                      {track.style_tags && track.style_tags.length > 0 && (
                                        <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                          {track.style_tags[0]}
                                        </Badge>
                                      )}
                                      {track.duration && (
                                        <div className="flex items-center gap-0.5 sm:gap-1 text-muted-foreground">
                                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                          <span className="text-[10px] sm:text-xs">
                                            {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Music className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0 hidden sm:block" />
                                </div>
                              </CardContent>
                            </Card>
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
