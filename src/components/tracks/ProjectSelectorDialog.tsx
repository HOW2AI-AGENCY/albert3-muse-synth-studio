/**
 * Project Selector Dialog
 * Allows user to select a project for adding tracks
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Folder, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProject: (projectId: string) => void;
}

export const ProjectSelectorDialog: React.FC<ProjectSelectorDialogProps> = ({
  open,
  onOpenChange,
  onSelectProject,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Fetch user's projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['user-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('music_projects')
        .select('id, name, description, total_tracks, cover_url')
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleConfirm = () => {
    if (selectedProjectId) {
      onSelectProject(selectedProjectId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить в проект</DialogTitle>
          <DialogDescription>
            Выберите проект, в который хотите добавить треки
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {!isLoading && projects && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Folder className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                У вас пока нет проектов
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Создать проект
              </Button>
            </div>
          )}

          {!isLoading && projects && projects.length > 0 && (
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all',
                    'hover:bg-accent hover:border-primary',
                    selectedProjectId === project.id
                      ? 'bg-accent border-primary ring-2 ring-primary/30'
                      : 'border-border'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {project.cover_url ? (
                      <img
                        src={project.cover_url}
                        alt={project.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Folder className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{project.name}</h4>
                      {project.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {project.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.total_tracks || 0} треков
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedProjectId}
          >
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
