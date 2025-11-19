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
  ResponsiveDialogFooter as DialogFooter,
} from '@/components/ui/responsive-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Music, Clock, Disc3, Sparkles, Save } from '@/utils/iconImports';
import { useTracks } from '@/hooks/useTracks';
import { useGenerateProjectTracklist } from '@/hooks/useGenerateProjectTracklist';
import { TrackActions } from '@/components/projects/TrackActions';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUploadField } from '@/components/ui/image-uploader';
import { useProjects } from '@/contexts/project/useProjects';
import { Skeleton } from '@/components/ui/skeleton';

type MusicProject = Database['public']['Tables']['music_projects']['Row'];
type MusicProjectUpdate = Database['public']['Tables']['music_projects']['Update'];

interface ProjectDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: MusicProject | null;
}

const ProjectSkeleton = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-8 w-3/4" />
    <Skeleton className="h-20 w-full" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
    <Skeleton className="h-10 w-full" />
  </div>
);

export const ProjectDetailsDialog: React.FC<ProjectDetailsDialogProps> = ({
  open,
  onOpenChange,
  project,
}) => {
  const queryClient = useQueryClient();
  const { updateProject, isUpdating } = useProjects();
  const { tracks: allTracks, isLoading: isLoadingTracks } = useTracks(undefined, {
    projectId: project?.id 
  });
  const { generateTracklist, isGenerating } = useGenerateProjectTracklist();

  // Step 1: Local state for form data
  const [formData, setFormData] = useState<Partial<MusicProjectUpdate>>({});

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        concept_description: project.concept_description,
        cover_url: project.cover_url,
        is_public: project.is_public,
        persona_id: project.persona_id,
      });
    }
  }, [project]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (file: File | null) => {
    // Note: This assumes ImageUploadField handles the actual upload and returns a URL.
    // For now, we'll just simulate this. A real implementation needs to call a service.
    if (file) {
      setFormData(prev => ({ ...prev, cover_url: URL.createObjectURL(file) }));
    } else {
      setFormData(prev => ({ ...prev, cover_url: null }));
    }
  };

  const handleSave = async () => {
    if (project) {
      await updateProject(project.id, formData);
      onOpenChange(false); // Close dialog on save
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "w-[calc(100vw-2rem)] lg:w-full",
        "max-w-4xl h-[90vh] max-h-[900px]",
        "p-0 flex flex-col"
      )}>
        <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 flex-shrink-0 border-b">
          <DialogTitle className="text-lg sm:text-xl">Редактировать проект</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Cover & Main Info */}
            <div className="md:col-span-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cover">Обложка проекта</Label>
                {/* Step 2: Integrate ImageUploadField */}
                <ImageUploadField
                  initialImage={formData.cover_url}
                  onFileChange={handleFileChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Название проекта</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                />
              </div>
               {/* Step 3: Add persona field (placeholder) */}
              <div className="space-y-2">
                <Label htmlFor="persona">Персона</Label>
                <Input
                  id="persona"
                  name="persona_id"
                  value={formData.persona_id || 'Не выбрана'}
                  onChange={handleInputChange}
                  disabled // Placeholder
                  className="disabled:opacity-75"
                />
              </div>
            </div>

            {/* Right Column: Descriptions & Tracklist */}
            <div className="md:col-span-2 space-y-4">
              {/* Step 3: Add description fields */}
              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="Краткое описание проекта..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="concept_description">Концепция</Label>
                <Textarea
                  id="concept_description"
                  name="concept_description"
                  value={formData.concept_description || ''}
                  onChange={handleInputChange}
                  placeholder="Подробная концепция, идеи, структура альбома..."
                  rows={6}
                />
              </div>

              {/* Step 5 & 6: Tracklist improvements */}
              <div className="flex items-center justify-between pt-2">
                <h3 className="text-base font-semibold">Треклист</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => project && generateTracklist(project)}
                  disabled={isGenerating || isLoadingTracks}
                >
                  {isGenerating ? 'Генерация...' : <><Sparkles className="h-4 w-4 mr-2" />Сгенерировать треклист</>}
                </Button>
              </div>

              <Card className="p-2 min-h-[200px]">
                {isLoadingTracks ? (
                   <div className="flex items-center justify-center h-full">
                     <p className="text-sm text-muted-foreground">Загрузка треков...</p>
                   </div>
                ) : projectTracks.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center p-4">
                    <div>
                      <Music className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Треклист пуст. <br/> Сгенерируйте его с помощью AI.</p>
                    </div>
                  </div>
                ) : (
                  // Step 5: Mobile-friendly tracklist
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {projectTracks.map((track) => (
                      <Card key={track.id} className="p-2.5 flex gap-3 items-center">
                         <div className="w-10 h-10 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="font-medium text-sm truncate" title={track.title || ''}>{track.title}</p>
                           <p className="text-xs text-muted-foreground truncate">{track.status}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </ScrollArea>

        {/* Step 4: Save button */}
        <DialogFooter className="px-4 sm:px-6 py-3 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? 'Сохранение...' : <><Save className="h-4 w-4 mr-2" />Сохранить</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
