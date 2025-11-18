
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDAWProjects } from '@/hooks/useDAWProjects';
import type { DAWProject } from '@/types/daw-project.types';

interface ProjectBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (project: DAWProject) => void;
  onDelete: (projectId: string) => void;
  isLoading: boolean;
  projects: DAWProject[];
}

export function ProjectBrowser({
  open,
  onOpenChange,
  onSelect,
  onDelete,
  isLoading,
  projects,
}: ProjectBrowserProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Open Project</DialogTitle>
          <DialogDescription>
            Select a project to load it into the DAW.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <p>Loading projects...</p>
          ) : (
            <ul>
              {projects.map((project) => (
                <li key={project.id} className="flex justify-between items-center p-2 hover:bg-muted">
                  <span onClick={() => onSelect(project)} className="cursor-pointer">
                    {project.name}
                  </span>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(project.id)}>
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
