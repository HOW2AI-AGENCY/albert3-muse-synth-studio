/**
 * Project Selector Component
 * Allows selecting a project to associate generated tracks with
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Folder, Plus } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onCreateProject?: () => void;
}

export const ProjectSelector = ({
  selectedProjectId,
  onProjectSelect,
  onCreateProject,
}: ProjectSelectorProps) => {
  const { projects, isLoading } = useProjects();

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-muted-foreground" />
          Проект
        </Label>
        {onCreateProject && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCreateProject}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Создать
          </Button>
        )}
      </div>

      <Select
        value={selectedProjectId || 'none'}
        onValueChange={(value) => onProjectSelect(value === 'none' ? null : value)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Не выбран">
            {selectedProject ? (
              <div className="flex items-center gap-2">
                <span className="truncate">{selectedProject.name}</span>
                {(selectedProject.total_tracks ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedProject.completed_tracks ?? 0}/{selectedProject.total_tracks ?? 0})
                  </span>
                )}
              </div>
            ) : (
              'Не выбран'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Без проекта</span>
          </SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center justify-between w-full gap-2">
                <span className="truncate">{project.name}</span>
                {(project.total_tracks ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {project.completed_tracks ?? 0}/{project.total_tracks ?? 0}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedProject && (
        <p className="text-xs text-muted-foreground">
          {selectedProject.genre && `${selectedProject.genre}`}
          {selectedProject.mood && ` • ${selectedProject.mood}`}
        </p>
      )}
    </div>
  );
};
