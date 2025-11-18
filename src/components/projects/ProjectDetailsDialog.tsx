/**
 * Project Details Dialog - Enhanced Mobile Optimized
 *
 * @version 3.0.0
 */

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Music, Clock, Disc3, Sparkles, Upload, Edit2 as Edit } from "@/utils/iconImports";
import { useTracks } from "@/hooks/useTracks";
import { useGenerateProjectTracklist } from "@/hooks/useGenerateProjectTracklist";
import { TrackActions } from "@/components/projects/TrackActions";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/contexts/project/useProjects";
import { PersonaSelector } from "@/components/generator/ui/PersonaSelector";
import { LyricsGenerationDialog } from "./LyricsGenerationDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type MusicProject = Database["public"]["Tables"]["music_projects"]["Row"];

interface ProjectDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: MusicProject | null;
}

export const ProjectDetailsDialog: React.FC<ProjectDetailsDialogProps> = ({ open, onOpenChange, project }) => {
  const queryClient = useQueryClient();
  const { updateProject } = useProjects();
  const { tracks: allTracks } = useTracks(undefined, {
    projectId: project?.id,
  });
  const { generateTracklist, isGenerating } = useGenerateProjectTracklist();

  // ========== STATE ==========
  const [isPublic, setIsPublic] = useState<boolean>(!!project?.is_public);
  const [coverUrl, setCoverUrl] = useState<string | null>(project?.cover_url || null);
  const [description, setDescription] = useState<string>(project?.description || "");
  const [conceptDescription, setConceptDescription] = useState<string>(project?.concept_description || "");
  const [personaId, setPersonaId] = useState<string | null>(project?.persona_id || null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState<boolean>(false);
  const [selectedTrackForLyrics, setSelectedTrackForLyrics] = useState<any>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [debouncedDescription] = useDebounce(description, 120000);
  const [debouncedConcept] = useDebounce(conceptDescription, 120000);

  useEffect(() => {
    if (project) {
      setIsPublic(!!project.is_public);
      setCoverUrl(project.cover_url);
      setDescription(project.description || "");
      setConceptDescription(project.concept_description || "");
      setPersonaId(project.persona_id);
    }
  }, [project]);

  useEffect(() => {
    if (project && debouncedDescription !== project.description) {
      updateProject(project.id, { description: debouncedDescription } as any);
    }
  }, [debouncedDescription, project, updateProject]);

  useEffect(() => {
    if (project && debouncedConcept !== project.concept_description) {
      updateProject(project.id, { concept_description: debouncedConcept } as any);
    }
  }, [debouncedConcept, project, updateProject]);

  const projectTracks = useMemo(() => {
    return allTracks.sort((a, b) => {
      const orderA = (a.metadata as any)?.planned_order ?? 999;
      const orderB = (b.metadata as any)?.planned_order ?? 999;
      return orderA - orderB;
    });
  }, [allTracks]);

  const completedTracks = useMemo(() => {
    return projectTracks.filter((track) => track.status === "completed");
  }, [projectTracks]);

  const draftTracks = useMemo(() => {
    return projectTracks.filter((track) => track.status !== "completed" && track.status !== "failed");
  }, [projectTracks]);

  const completionPercent = useMemo(() => {
    if (!project?.total_tracks || project.total_tracks === 0) return 0;
    return Math.round(((project.completed_tracks || 0) / project.total_tracks) * 100);
  }, [project]);

  const handleCoverUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !project) return;

      const allowedTypes = ["image/jpeg", "image/png", "image/svg+xml"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Только JPG, PNG, SVG");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Макс. 5MB");
        return;
      }

      setIsUploading(true);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${project.id}-${Date.now()}.${fileExt}`;
        const filePath = `project-covers/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("project-assets").upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("project-assets").getPublicUrl(filePath);

        setCoverUrl(publicUrl);
        await updateProject(project.id, { cover_url: publicUrl } as any);
        toast.success("Обложка загружена");
      } catch (error) {
        toast.error("Ошибка загрузки");
      } finally {
        setIsUploading(false);
      }
    },
    [project, updateProject],
  );

  const handlePersonaChange = useCallback(
    async (newPersonaId: string | null) => {
      if (!project) return;
      setPersonaId(newPersonaId);
      await updateProject(project.id, { persona_id: newPersonaId } as any);
      toast.success("Персона обновлена");
    },
    [project, updateProject],
  );

  if (!project) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] lg:w-[calc(100vw-4rem)]",
            "max-w-[1200px] h-[90vh] sm:h-[85vh] max-h-[900px]",
            "p-0 flex flex-col",
          )}
        >
          <DialogHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 flex-shrink-0 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <DialogTitle className="text-base sm:text-lg lg:text-xl truncate">{project.name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditMode(!isEditMode)} className="h-7 sm:h-8">
                  <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                  <span className="text-xs">{isEditMode ? "Просмотр" : "Редактировать"}</span>
                </Button>
                <span className="text-xs text-muted-foreground hidden sm:inline">Публичный</span>
                <Switch
                  checked={isPublic}
                  onCheckedChange={async (checked) => {
                    setIsPublic(checked);
                    await updateProject(project.id, { is_public: checked } as any);
                  }}
                />
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-3 sm:px-6">
            <div className="space-y-3 sm:space-y-4 pb-4">
              <Card className="p-3 sm:p-4 bg-muted/30">
                <Label className="text-xs sm:text-sm font-medium mb-2 block">Обложка проекта</Label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div
                    className={cn(
                      "w-full sm:w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden",
                      coverUrl ? "border-primary/50" : "border-muted-foreground/30",
                    )}
                  >
                    {coverUrl ? (
                      <img src={coverUrl} alt="Project cover" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">JPG, PNG, SVG (макс. 5MB)</p>
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png,.svg"
                      onChange={handleCoverUpload}
                      disabled={isUploading || !isEditMode}
                      className="text-xs sm:text-sm h-8 sm:h-9"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-2.5 sm:p-3 bg-muted/50">
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

              <Card className="p-3 sm:p-4 bg-muted/30">
                <Label className="text-xs sm:text-sm font-medium mb-2 block">Музыкальная персона</Label>
                <PersonaSelector
                  value={personaId}
                  onValueChange={handlePersonaChange}
                  disabled={!isEditMode}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">Персона определяет стиль всех треков</p>
              </Card>

              <Accordion type="single" collapsible defaultValue="desc">
                <AccordionItem value="desc">
                  <AccordionTrigger className="text-xs sm:text-sm py-2">Описание проекта</AccordionTrigger>
                  <AccordionContent>
                    {isEditMode ? (
                      <>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Описание (мин. 200 символов)..."
                          className="min-h-[100px] text-xs sm:text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{description.length} символов</p>
                      </>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                        {description || "Нет описания"}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Accordion type="single" collapsible>
                <AccordionItem value="concept">
                  <AccordionTrigger className="text-xs sm:text-sm py-2">Концепция</AccordionTrigger>
                  <AccordionContent>
                    {isEditMode ? (
                      <Textarea
                        value={conceptDescription}
                        onChange={(e) => setConceptDescription(e.target.value)}
                        placeholder="Концепция, история..."
                        className="min-h-[120px] text-xs sm:text-sm"
                      />
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                        {conceptDescription || "Нет концепции"}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Card className="p-2 sm:p-2.5">
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
                    <span className="text-lg font-bold">{Math.floor((project.total_duration || 0) / 60)}м</span>
                  </div>
                </Card>

                <Card className="p-2.5">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Music className="h-3.5 w-3.5" />
                      <span className="text-xs">Жанр</span>
                    </div>
                    <span className="text-xs font-medium truncate">{project.genre || "—"}</span>
                  </div>
                </Card>

                <Card className="p-2.5">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Music className="h-3.5 w-3.5" />
                      <span className="text-xs">Mood</span>
                    </div>
                    <span className="text-xs font-medium truncate">{project.mood || "—"}</span>
                  </div>
                </Card>
              </div>

              <div className="flex items-center justify-between pt-2">
                <h3 className="text-xs sm:text-sm font-semibold">Треки</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => project && generateTracklist(project)}
                  disabled={isGenerating}
                  className="h-7 sm:h-8 text-xs"
                >
                  {isGenerating ? (
                    "Генерация..."
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI
                    </>
                  )}
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
                            <Badge variant={track.status === "completed" ? "default" : "secondary"} className="text-xs">
                              {track.status === "completed" ? "Готов" : "Черновик"}
                            </Badge>
                          </div>
                          {track.prompt && <p className="text-xs text-muted-foreground line-clamp-2">{track.prompt}</p>}
                          <TrackActions
                            track={track as any}
                            projectId={project.id}
                            projectName={project.name}
                            projectDescription={project.description}
                            projectGenre={project.genre}
                            projectMood={project.mood}
                            onLyricsGenerated={() => queryClient.invalidateQueries({ queryKey: ["tracks"] })}
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

      <LyricsGenerationDialog
        open={lyricsDialogOpen}
        onOpenChange={setLyricsDialogOpen}
        track={selectedTrackForLyrics}
        projectId={project?.id}
      />
    </>
  );
};
